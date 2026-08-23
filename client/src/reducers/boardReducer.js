export const initialState = {
  columns: {
    todo: [
      { id: '1', title: 'test1', description: 'test1', priority: 'High Priority', status: 'todo' }
    ],
    doing: [
      { id: '2', title: 'test2', description: 'test2', priority: 'In Progress', status: 'doing' }
    ],
    done: [
      { id: '3', title: 'test3', description: 'test3', priority: 'Completed', date: 'Oct 12', status: 'done' }
    ]
  },
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
    case 'TASK_CREATED': {
      const status = action.payload.status || 'todo';
      return {
        ...state,
        columns: {
          ...state.columns,
          [status]: [...(state.columns[status] || []), action.payload],
        },
      };
    }

    case 'TASK_UPDATED': {
      const updated = action.payload;
      const newColumns = { ...state.columns };
      Object.keys(newColumns).forEach((colKey) => {
        newColumns[colKey] = newColumns[colKey].map((task) =>
          isSameTask(task, updated) ? updated : task
        );
      });
      return { ...state, columns: newColumns };
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