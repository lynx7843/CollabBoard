import { useReducer, useState } from 'react';
import { Plus, Pencil, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { boardReducer, initialState } from '../reducers/boardReducer';
import { useBoardSockets } from '../hooks/useBoardSockets';
import { colors, shadowSm } from '../theme';

const COLUMN_META = {
  todo: {
    title: 'To Do',
    badge: (task) => ({
      label: task.priority || 'To Do',
      bg: colors.yellow100,
      color: colors.yellow900,
      border: `1px solid ${colors.yellow300}`,
    }),
  },
  doing: {
    title: 'Doing',
    badge: (task) => ({
      label: task.priority || 'In Progress',
      bg: colors.black,
      color: colors.yellow300,
    }),
  },
  done: {
    title: 'Done',
    badge: () => ({
      label: 'Completed',
      bg: colors.white,
      color: colors.gray600,
      border: `1px solid ${colors.gray300}`,
      icon: true,
    }),
  },
};

const ColumnHeader = ({ title, count }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.black }}>{title}</h2>
      <span style={{
        backgroundColor: colors.yellow400,
        color: colors.black,
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '2px 10px',
        borderRadius: '9999px'
      }}>
        {count}
      </span>
    </div>
    <button
      type="button"
      aria-label={`${title} options`}
      className="cb-col-menu"
      style={{
        display: 'flex',
        padding: '4px',
        borderRadius: '4px',
        border: 'none',
        background: 'transparent',
        color: colors.gray400,
        cursor: 'pointer',
        transition: 'background-color 150ms, color 150ms'
      }}
    >
      <MoreHorizontal size={20} />
    </button>
  </div>
);

const actionButtonStyle = {
  border: 'none',
  background: 'transparent',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 150ms, color 150ms',
};

const TaskCard = ({ task, badge, isDone, status, onEdit, onMove, onDelete }) => {
  const [changing, setChanging] = useState(false);
  const targets = Object.keys(COLUMN_META).filter((s) => s !== status);

  return (
  <article
    className="cb-card"
    style={{
      backgroundColor: colors.white,
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${colors.gray200}`,
      boxShadow: shadowSm,
      transition: 'border-color 150ms'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: badge.bg,
        color: badge.color,
        border: badge.border,
        fontSize: '12px',
        fontWeight: '600',
        padding: '4px 10px',
        borderRadius: '6px'
      }}>
        {badge.icon && <CheckCircle2 size={14} />}
        {badge.label}
      </span>
      <button
        type="button"
        aria-label={`Edit ${task.title}`}
        onClick={() => onEdit(task)}
        className="cb-icon-btn"
        style={{
          display: 'flex',
          padding: '4px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          color: colors.gray400,
          cursor: 'pointer',
          transition: 'background-color 150ms, color 150ms'
        }}
      >
        <Pencil size={16} />
      </button>
    </div>

    <h3 style={{
      marginBottom: '6px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: isDone ? colors.gray400 : colors.black,
      textDecoration: isDone ? 'line-through' : 'none'
    }}>
      {task.title}
    </h3>

    <p style={{ fontSize: '14px', color: isDone ? colors.gray400 : colors.gray600 }}>
      {task.description}
    </p>

    {task.date && (
      <p style={{ marginTop: '12px', fontSize: '14px', color: colors.gray400 }}>{task.date}</p>
    )}

    {/* Per-task actions */}
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.gray200}` }}>
      {changing ? (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: colors.gray500 }}>Move to:</span>
          {targets.map((target) => (
            <button
              key={target}
              type="button"
              className="cb-move-option"
              onClick={() => { setChanging(false); onMove(task, status, target); }}
              style={{
                ...actionButtonStyle,
                border: `1px solid ${colors.gray300}`,
                color: colors.black,
              }}
            >
              {COLUMN_META[target].title}
            </button>
          ))}
          <button
            type="button"
            className="cb-task-action"
            onClick={() => setChanging(false)}
            style={{ ...actionButtonStyle, marginLeft: 'auto', color: colors.gray500 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="cb-task-action"
            onClick={() => setChanging(true)}
            style={{ ...actionButtonStyle, color: colors.gray600 }}
          >
            Change
          </button>
          <button
            type="button"
            className="cb-task-delete"
            onClick={() => onDelete(task)}
            style={{ ...actionButtonStyle, color: '#dc2626' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  </article>
  );
};

const AddTaskButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="cb-add-task"
    style={{
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: '12px',
      border: `1px dashed ${colors.gray300}`,
      background: 'transparent',
      padding: '12px',
      fontSize: '14px',
      fontWeight: '500',
      color: colors.gray500,
      cursor: 'pointer',
      transition: 'border-color 150ms, background-color 150ms, color 150ms'
    }}
  >
    <Plus size={16} />
    Add Task
  </button>
);

// The badge renders `task.priority`, so it has to track the column a task
// sits in — both when a task is created and when it is moved.
const priorityFor = (status) =>
  status === 'done' ? 'Completed' : status === 'doing' ? 'In Progress' : 'High Priority';

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
    priority: priorityFor(status),
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

  const handleEditTask = async (task) => {
    const title = window.prompt('Task title:', task.title);
    if (title === null) return;
    const description = window.prompt('Task description:', task.description || '');
    if (description === null) return;

    const updated = { ...task, title: title || task.title, description };
    dispatch({ type: 'TASK_UPDATED', payload: updated });
    if (submitAction) {
      await submitAction({ type: 'UPDATE_TASK', taskId: task.id || task._id, task: updated });
    }
  };

  const handleMoveTask = async (task, from, to) => {
    if (from === to) return;
    const taskId = task.id || task._id;

    dispatch({ type: 'TASK_MOVED', payload: { taskId, from, to } });
    // Keep the badge in step with the column the task now sits in.
    dispatch({ type: 'TASK_UPDATED', payload: { ...task, status: to, priority: priorityFor(to) } });

    if (submitAction) {
      await submitAction({ type: 'MOVE_TASK', taskId, from, to });
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const taskId = task.id || task._id;

    dispatch({ type: 'TASK_DELETED', payload: taskId });
    if (submitAction) {
      await submitAction({ type: 'DELETE_TASK', taskId });
    }
  };

  return (
    <div>
      {/* Board Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-0.025em', color: colors.black }}>
            Q3 Roadmap
          </h2>
          <p style={{ marginTop: '4px', color: colors.gray500 }}>Manage all upcoming features and fixes.</p>
        </div>
        <button
          type="button"
          onClick={() => handleAddTask('todo')}
          className="cb-new-task"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: colors.yellow400,
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            color: colors.black,
            cursor: 'pointer',
            transition: 'background-color 150ms'
          }}>
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Kanban Columns Layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {Object.entries(COLUMN_META).map(([status, meta]) => {
          const tasks = state.columns[status] || [];
          return (
            <section
              key={status}
              style={{
                display: 'flex',
                flexDirection: 'column',
                // 360px is the sizing basis from skeleton.jsx, but the columns
                // grow to share the full width of the board area (its `w-full`)
                // and shrink no further than 280px before the board scrolls.
                flex: '1 1 360px',
                minWidth: '280px',
                borderRadius: '16px',
                border: `1px solid ${colors.gray200}`,
                backgroundColor: colors.gray50,
                padding: '16px'
              }}
            >
              <ColumnHeader title={meta.title} count={tasks.length} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id || task._id}
                    task={task}
                    badge={meta.badge(task)}
                    isDone={status === 'done'}
                    status={status}
                    onEdit={handleEditTask}
                    onMove={handleMoveTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
                <AddTaskButton onClick={() => handleAddTask(status)} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
