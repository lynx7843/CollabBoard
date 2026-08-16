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
          task._id === updated._id || task.id === updated.id ? updated : task
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