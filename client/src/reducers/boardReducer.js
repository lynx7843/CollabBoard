/*
 * A board starts empty — its tasks are loaded from
 * GET /api/boards/:slug/tasks and applied with TASKS_LOADED, so a newly
 * created board renders three empty columns rather than sample cards.
 */
export const initialState = {
  columns: { todo: [], doing: [], done: [] },
  loading: false,
  error: null,
};

// Tasks created locally carry `id` while server tasks carry `_id`, so a plain
// `a._id === b._id` comparison matches every task once both sides are
// undefined. Only compare a key when the incoming task actually has it.
const isSameTask = (task, updated) =>
  (updated._id !== undefined && task._id === updated._id) ||
  (updated.id !== undefined && task.id === updated.id);

export function boardReducer(state, action) {
  switch (action.type) {
    // Replaces every column at once with what the server holds.
    case 'TASKS_LOADED':
      return {
        ...state,
        columns: { todo: [], doing: [], done: [], ...action.payload },
        loading: false,
        error: null,
      };

    // Back to empty while a different board's tasks are being fetched, so the
    // previous board's cards never show under the new board's name.
    case 'BOARD_CHANGED':
      return { ...initialState, loading: true };
    /*
     * The board this runs on is also listening for task:created, and the server
     * broadcasts to the whole room including whoever wrote the task — so the
     * client that just added a card sees it arrive a second time. Adding a task
     * it already holds is ignored rather than rendered twice.
     */
    case 'TASK_CREATED': {
      const status = action.payload.status || 'todo';
      const alreadyHeld = Object.values(state.columns).some((column) =>
        column.some((task) => isSameTask(task, action.payload))
      );
      if (alreadyHeld) return state;

      return {
        ...state,
        columns: {
          ...state.columns,
          [status]: [...(state.columns[status] || []), action.payload],
        },
      };
    }

    /*
     * An edit replaces a task where it sits. A move made by someone else,
     * though, arrives here as the same task:updated event carrying a different
     * status — there is no separate "moved" event on the wire — so a status
     * that disagrees with the column the task is currently in relocates it.
     * A local edit keeps the task's own status, so it still replaces in place.
     */
    case 'TASK_UPDATED': {
      const updated = action.payload;
      const from = Object.keys(state.columns).find((colKey) =>
        state.columns[colKey].some((task) => isSameTask(task, updated))
      );

      // Not a task this board is showing (a stale event, or one for a board
      // that has since been switched away from).
      if (!from) return state;

      const to = updated.status || from;

      if (to === from || !state.columns[to]) {
        return {
          ...state,
          columns: {
            ...state.columns,
            [from]: state.columns[from].map((task) => (isSameTask(task, updated) ? updated : task)),
          },
        };
      }

      return {
        ...state,
        columns: {
          ...state.columns,
          [from]: state.columns[from].filter((task) => !isSameTask(task, updated)),
          [to]: [...state.columns[to], updated],
        },
      };
    }

    // Moves a task between columns. TASK_UPDATED replaces a task in place and
    // deliberately keeps its column, so relocating needs its own action.
    case 'TASK_MOVED': {
      const { taskId, from, to } = action.payload;
      if (from === to) return state;

      const source = state.columns[from] || [];
      const task = source.find((t) => t._id === taskId || t.id === taskId);
      if (!task) return state;

      return {
        ...state,
        columns: {
          ...state.columns,
          [from]: source.filter((t) => t !== task),
          [to]: [...(state.columns[to] || []), { ...task, status: to }],
        },
      };
    }

    case 'TASK_DELETED': {
      const taskId = action.payload;
      const newColumns = { ...state.columns };
      Object.keys(newColumns).forEach((colKey) => {
        newColumns[colKey] = newColumns[colKey].filter(
          (task) => task._id !== taskId && task.id !== taskId
        );
      });
      return { ...state, columns: newColumns };
    }

    default:
      return state;
  }
}