import { taskIdOf, withServerId } from './taskRequests';

/*
 * Replaying what was saved while the server could not be reached.
 *
 * Order is the whole problem. A task created offline carries a local id, so
 * every edit queued behind it refers to a task the server has never heard of;
 * the create has to land first, and everything after it has to be rewritten to
 * the id that came back. Replaying out of order would 404 on each follow-up.
 *
 * Pure: `send` does the talking, this decides what to send and what to keep.
 * Returns what is left of the queue, plus the conflict that stopped it if one
 * did.
 */
export async function replayQueue(queue, send) {
  const idMap = new Map();
  const remaining = [];
  const dropped = [];
  let conflict = null;
  let stopped = false;

  for (const queued of queue) {
    if (stopped) {
      remaining.push(queued);
      continue;
    }

    const localId = taskIdOf(queued);
    const serverId = idMap.get(localId);
    const action = serverId ? withServerId(queued, serverId) : queued;

    // Sequential on purpose: a create must land before the edits that follow it.
    const result = await send(action);

    if (result.saved) {
      const createdId = result.data?.task?._id;
      if (queued.type === 'CREATE_TASK' && createdId && localId) idMap.set(localId, createdId);
      continue;
    }

    if (result.conflict) {
      // A person has to choose. Keep this change and everything behind it, and
      // stop rather than raising one dialog per queued change.
      conflict = { action, latest: result.latest, queuedId: queued.id };
      remaining.push(queued);
      stopped = true;
      continue;
    }

    if (result.unreachable) {
      remaining.push(queued);
      stopped = true;
      continue;
    }

    /*
     * Refused outright — the task was deleted on the server while this device
     * was away, say. Replaying it again would fail identically, so it is
     * dropped rather than kept forever, and so is anything queued behind it
     * that addressed the same task.
     */
    dropped.push({ action: queued, error: result.error });
  }

  return { remaining, conflict, dropped };
}
