import { useCallback, useEffect, useState } from 'react';
import { cacheBoardData, getCachedBoardData, getOfflineQueue, queueOfflineAction, replaceOfflineQueue } from '../storage';
import { DEMO_MODE } from '../../demo/demoMode';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const readResponse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const useBoardPersistence = (boardId, fallbackBoard) => {
  const [board, setBoard] = useState(() => getCachedBoardData(boardId) || fallbackBoard);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(null);

  const saveBoard = useCallback((update) => {
    setBoard((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      cacheBoardData(boardId, next);
      return next;
    });
  }, [boardId]);

  const fetchLatestTask = useCallback(async (action, conflictData) => {
    const taskId = action.taskId || action.task?._id || action.payload?._id;
    const suppliedTask = conflictData?.latest || conflictData?.serverTask || conflictData?.currentTask;
    if (!taskId) return suppliedTask || conflictData?.task || null;

    const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return suppliedTask || conflictData?.task || null;
    return readResponse(response);
  }, [boardId]);

  const submitAction = useCallback(async (action) => {
    // No actions endpoint yet: report success so edits don't queue as
    // "server unavailable" and push an error into the status bar.
    if (DEMO_MODE) return { saved: true, data: action };

    if (!navigator.onLine) {
      queueOfflineAction({ boardId, ...action });
      setMessage('Change saved locally. It will sync when you reconnect.');
      return { queued: true };
    }
    try {
      const response = await fetch(`/api/boards/${boardId}/actions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(action),
      });
      if (response.status === 409) {
        const data = await readResponse(response);
        let latest = null;
        try {
          latest = await fetchLatestTask(action, data);
        } catch (error) {
          latest = data?.latest || data?.serverTask || data?.currentTask || data?.task || null;
        }
        setConflict({ action, latest, server: data });
        setMessage('This task changed on the server. Choose which version to keep.');
        return { conflict: true, latest };
      }
      if (!response.ok) throw new Error('Unable to save change.');
      setMessage('');
      return { saved: true, data: await readResponse(response) };
    } catch (error) {
      queueOfflineAction({ boardId, ...action });
      setMessage('Server unavailable. Change saved locally for retry.');
      return { queued: true, error };
    }
  }, [boardId, fetchLatestTask]);

  const resolveConflict = useCallback(async (choice) => {
    if (!conflict) return;
    const pending = conflict.action;
    setConflict(null);

    if (choice === 'useServer') {
      setMessage('Keeping the latest server version.');
      return { resolved: true, task: conflict.latest };
    }

    const latestVersion = conflict.latest?.version ?? conflict.server?.version;
    const overwriteAction = latestVersion === undefined
      ? pending
      : { ...pending, version: latestVersion, expectedVersion: latestVersion };
    return submitAction(overwriteAction);
  }, [conflict, submitAction]);

  const syncQueue = useCallback(async () => {
    if (DEMO_MODE) return;
    const queue = getOfflineQueue();
    if (!queue.length) return;
    setIsSyncing(true);
    setMessage('Connection restored. Syncing saved changes...');
    const remaining = [];
    for (const action of queue) {
      try {
        const response = await fetch(`/api/boards/${action.boardId}/actions`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(action),
        });
        if (!response.ok) throw new Error();
      } catch (error) { remaining.push(action); }
    }
    replaceOfflineQueue(remaining);
    setIsSyncing(false);
    setMessage(remaining.length ? `${remaining.length} change(s) still waiting to sync.` : 'All offline changes are synced.');
  }, []);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}`, {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error();
        saveBoard(await response.json());
        setMessage('');
      } catch (error) {
        if (getCachedBoardData(boardId)) setMessage('Showing the latest board saved on this device.');
      }
    };
    // No boards endpoint yet: skip the request that would always fail and
    // leave a stale-cache notice in the status bar.
    if (!DEMO_MODE && navigator.onLine) fetchBoard();
  }, [boardId, saveBoard]);

  useEffect(() => {
    const online = () => { setIsOnline(true); syncQueue(); };
    const offline = () => { setIsOnline(false); setMessage('You are offline. Changes will be saved on this device.'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [syncQueue]);

  return {
    board,
    saveBoard,
    submitAction,
    conflict,
    resolveConflict,
    isOnline,
    isSyncing,
    message,
  };
};
