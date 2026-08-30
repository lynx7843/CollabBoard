/*
 * Translating "what the user did" into "what to send".
 *
 * The server has no /actions endpoint: an action becomes the ordinary REST call
 * it corresponds to, so a change replayed from the offline queue goes through
 * exactly the same API a live one does, and there is only one server contract
 * to keep working.
 *
 * Kept apart from the hook that calls it because it is the part with rules in
 * it, and rules are worth being able to test on their own.
 */

// A task the server has seen has a 24-character ObjectId. Anything else is a
// draft created while offline, whose real id does not exist yet.
export const isServerId = (id) => /^[0-9a-f]{24}$/i.test(String(id || ''));

export const taskIdOf = (action) => action.taskId || action.task?._id || action.task?.id || null;

// Everything but a create addresses an existing task, so it cannot be sent
// until that task exists on the server.
export const needsServerId = (action) => action.type !== 'CREATE_TASK';

// True when the action refers to a task the server has never issued an id for.
export const isPending = (action) => needsServerId(action) && !isServerId(taskIdOf(action));

/*
 * Rewrites an action to use the id the server issued for a task that was
 * created offline, so the edits queued behind that create address a real task.
 */
export const withServerId = (action, serverId) => ({
  ...action,
  taskId: serverId,
  ...(action.task ? { task: { ...action.task, _id: serverId } } : {}),
});

export function requestFor(boardId, action) {
  const base = `/api/boards/${boardId}/tasks`;
  const taskId = taskIdOf(action);

  switch (action.type) {
    case 'CREATE_TASK':
      return {
        path: base,
        method: 'POST',
        body: {
          title: action.task?.title,
          description: action.task?.description,
          status: action.status ?? action.task?.status,
          priority: action.task?.priority,
        },
      };

    case 'UPDATE_TASK':
      if (!isServerId(taskId)) return null;
      return {
        path: `${base}/${taskId}`,
        method: 'PATCH',
        body: {
          title: action.task?.title,
          description: action.task?.description,
          priority: action.task?.priority,
          // Present only when the caller wants a lost update refused rather
          // than applied over someone else's edit.
          ...(action.expectedVersion === undefined ? {} : { expectedVersion: action.expectedVersion }),
        },
      };

    case 'MOVE_TASK':
      if (!isServerId(taskId)) return null;
      return { path: `${base}/${taskId}`, method: 'PATCH', body: { status: action.to } };

    case 'DELETE_TASK':
      if (!isServerId(taskId)) return null;
      return { path: `${base}/${taskId}`, method: 'DELETE' };

    default:
      return null;
  }
}
