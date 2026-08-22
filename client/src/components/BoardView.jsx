import { useReducer } from 'react';
import { boardReducer, initialState } from '../reducers/boardReducer';
import { useBoardSockets } from '../hooks/useBoardSockets';

const COLUMN_META = {
  todo: { title: 'To Do', badge: (task) => ({ label: task.priority || 'To Do', bg: '#f5eab5', color: '#8a7719' }) },
  doing: { title: 'Doing', badge: (task) => ({ label: task.priority || 'In Progress', bg: '#1a1a1a', color: '#fff' }) },
  done: { title: 'Done', badge: () => ({ label: '✓ Completed', bg: '#f0f0f0', color: '#666', border: '1px solid #ddd' }) },
};

const ColumnHeader = ({ title, count }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontWeight: 'bold', fontSize: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {title}
      <span style={{ backgroundColor: '#ebd673', color: '#000', fontSize: '12px', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%' }}>
        {count}
      </span>
    </div>
    <span style={{ color: '#888', cursor: 'pointer' }}>•••</span>
  </div>
);

// Prompts for a title/description and returns a task object, or null if cancelled.
const promptForTask = (status) => {
  const title = window.prompt('Task title:');
  if (!title) return null;
  const description = window.prompt('Task description:') || '';
  return {
    id: `local-${Date.now()}`,
    title,
    description,
    status,
    priority: status === 'done' ? 'Completed' : status === 'doing' ? 'In Progress' : 'High Priority',
  };
};

export const BoardView = ({ boardId = 'group-13', submitAction }) => {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  // Keep the board in sync with real-time task events from other clients.
  useBoardSockets(boardId, dispatch);

  const handleAddTask = async (status) => {
    const task = promptForTask(status);
    if (!task) return;

    // Optimistically reflect the new task locally, then persist it
    // (submitAction handles offline queueing/sync when a backend is present).
    dispatch({ type: 'TASK_CREATED', payload: task });
    if (submitAction) {
      await submitAction({ type: 'CREATE_TASK', status, task });
    }
  };

  return (
    <div>
      {/* Board Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1a1a1a' }}>Q3 Roadmap</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Manage all upcoming features and fixes.</p>
        </div>
        <button
          onClick={() => handleAddTask('todo')}
          style={{
            backgroundColor: '#ebd673',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
          + New Task
        </button>
      </div>

      {/* Kanban Columns Layout */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {Object.entries(COLUMN_META).map(([status, meta]) => {
          const tasks = state.columns[status] || [];
          return (
            <div key={status} style={{ flex: 1, minWidth: '300px', backgroundColor: '#dedede', borderRadius: '12px', padding: '16px' }}>
              <ColumnHeader title={meta.title} count={tasks.length} />
              {tasks.map((task) => {
                const badge = meta.badge(task);
                const isDone = status === 'done';
                return (
                  <div key={task.id || task._id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc', marginBottom: '12px' }}>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, border: badge.border, fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {badge.label}
                    </span>
                    <h4 style={{ margin: '12px 0 4px 0', fontSize: '15px', color: isDone ? '#888' : undefined, textDecoration: isDone ? 'line-through' : undefined }}>
                      {task.title}
                    </h4>
                    <p style={{ margin: 0, color: isDone ? '#aaa' : '#888', fontSize: '12px' }}>
                      {task.description}
                      {isDone && task.date ? (<><br />{task.date}</>) : null}
                    </p>
                  </div>
                );
              })}
              <button
                onClick={() => handleAddTask(status)}
                style={{ width: '100%', border: '1px dashed #aaa', background: 'transparent', padding: '10px', borderRadius: '8px', color: '#666', cursor: 'pointer' }}>
                + Add Task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
