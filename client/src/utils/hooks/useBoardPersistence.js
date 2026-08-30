import { useCallback, useEffect, useState } from 'react';
import {
  getOfflineQueue,
  queueOfflineAction,
  removeQueuedAction,
  replaceOfflineQueue,
} from '../storage';
import { isPending, requestFor } from '../taskRequests';
import { replayQueue } from '../replayQueue';
import { DEMO_MODE } from '../../demo/demoMode';

/*
 * The write path for everything that happens to a task.
 *
 * BoardView never calls the API directly: it describes what the user did and
 * hands it here, which is what makes the offline behaviour possible at all. An
 * action either reaches the server, or is stored and replayed when the network
 * comes back — the board looks the same either way, because BoardView has
 * already applied the change optimistically.
 *
 * There is no /actions endpoint on the server. An action is translated into the
 * ordinary REST call it corresponds to, so the queue replays against the same
 * API a live edit uses and there is only one server contract to keep working.
 */
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const readResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useBoardPersistence = (boardId) => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(null);
  // Bumped whenever the server's copy has moved on behind the board's back — a
  // drained queue, a resolved conflict. BoardView refetches when it changes.
  const [revision, setRevision] = useState(0);

  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const countPending = useCallback(() => setPendingCount(getOfflineQueue().length), []);

  /*
   * Sends one action. The outcomes are deliberately distinct:
   *
   *   saved        the server applied it
   *   unreachable  the request never landed, so it is safe to replay
   *   conflict     someone else changed the task first; nothing was written
   *   failed       the server refused it (400/404/...) and always will, so it
   *                is reported rather than queued to fail forever
   */
  const send = useCallback(async (action) => {
    const request = requestFor(boardId, action);
    if (!request) return { failed: true, error: new Error('That change cannot be saved.') };

    let response;
    try {
      response = await fetch(request.path, {
        method: request.method,
        headers: authHeaders(),
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
    } catch (error) {
      // Only a transport failure reaches here: the request never landed, so it
      // is safe to replay.
      return { unreachable: true, error };
    }

    const data = await readResponse(response);

    if (response.status === 409) return { conflict: true, latest: data?.latest || null, data };
    if (!response.ok) return { failed: true, error: new Error(data?.message || 'Unable to save change.') };
    return { saved: true, data };
  }, [boardId]);

  const submitAction = useCallback(async (action) => {
    // Demo mode has no server to reach and nothing to replay against.
    if (DEMO_MODE) return { saved: true, data: action };

    if (!navigator.onLine) {
      queueOfflineAction({ boardId, ...action });
      countPending();
      setMessage('Saved on this device. It will sync when you reconnect.');
      return { queued: true };
    }

    /*
     * A change to a task that was created offline and has not been replayed
     * yet. It has no server id to address, so it joins the queue behind its own
     * creation — sending it now would 404 against an id the server never
     * issued.
     */
    if (isPending(action)) {
      queueOfflineAction({ boardId, ...action });
      countPending();
      setMessage('Saved on this device. It will sync once the new task reaches the server.');
      return { queued: true };
    }

    const result = await send(action);

    if (result.unreachable) {
      queueOfflineAction({ boardId, ...action });
      countPending();
      setMessage('Server unavailable. Saved on this device for retry.');
      return { queued: true };
    }

    if (result.conflict) {
      setConflict({ action, latest: result.latest });
      setMessage('This task changed on the server. Choose which version to keep.');
      return { conflict: true, latest: result.latest };
    }

    if (result.failed) return result;

    setMessage('');
    return result;
  }, [boardId, countPending, send]);

  /*
   * Replays the queue oldest first.
   *
   * A task created offline has a local id, so anything queued after its
   * creation refers to a task the server has never heard of. Replaying the
   * create first yields the real id, and the rest of the queue is rewritten to
   * use it — otherwise every follow-up edit would 404.
   */
  const syncQueue = useCallback(async () => {
    if (DEMO_MODE) return;

    const queue = getOfflineQueue();
    if (!queue.length || !navigator.onLine) return;

    setIsSyncing(true);
    setMessage(`Syncing ${queue.length} saved change(s)...`);

    const { remaining, conflict: blocked, dropped } = await replayQueue(queue, send);

    replaceOfflineQueue(remaining);
    setPendingCount(remaining.length);
    setIsSyncing(false);
    // The board's copy is now behind the server's, whatever the outcome.
    setRevision((n) => n + 1);

    if (blocked) {
      setConflict(blocked);
      setMessage('A saved change clashes with the server. Choose which version to keep.');
      return;
    }

    if (remaining.length) {
      setMessage(`${remaining.length} change(s) still waiting to sync.`);
      return;
    }

    setMessage(
      dropped.length
        ? `Synced. ${dropped.length} change(s) could no longer be applied and were discarded.`
        : 'All offline changes are synced.',
    );
  }, [send]);

  const resolveConflict = useCallback(async (choice) => {
    if (!conflict) return undefined;

    const { action, latest, queuedId } = conflict;
    setConflict(null);

    if (choice === 'useServer') {
      // Their version stands; this change is abandoned rather than retried.
      if (queuedId) removeQueuedAction(queuedId);
      countPending();
      setRevision((n) => n + 1);
      setMessage('Keeping the version saved on the server.');
      return { resolved: true, task: latest };
    }

    // Keep mine: the same edit, rebased onto the version the server actually
    // holds, so it is applied rather than refused a second time.
    const result = await send({ ...action, expectedVersion: latest?.version });

    if (result.saved) {
      if (queuedId) removeQueuedAction(queuedId);
      countPending();
      setMessage('Your version was saved.');
    } else {
      setMessage('Could not save your version. It is still on this device.');
    }

    setRevision((n) => n + 1);
    return result;
  }, [conflict, countPending, send]);

  // Drain on reconnect, and once on mount for changes queued in a previous
  // session — a refresh while offline leaves them sitting in storage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (navigator.onLine) syncQueue();
  }, [syncQueue]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      syncQueue();
    };
    const offline = () => {
      setIsOnline(false);
      setMessage('You are offline. Changes are being saved on this device.');
    };

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [syncQueue]);

  return {
    submitAction,
    conflict,
    resolveConflict,
    isOnline,
    isSyncing,
    message,
    pendingCount,
    revision,
  };
};
