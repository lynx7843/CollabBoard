import { useCallback, useEffect, useReducer, useState } from 'react';
import { Plus, Pencil, CheckCircle2 } from 'lucide-react';
import { boardReducer, initialState } from '../reducers/boardReducer';
import { useBoardSockets } from '../hooks/useBoardSockets';
import { api } from '../api';
import { DEMO_MODE } from '../demo/demoMode';
import { colors, shadowSm } from '../theme';

const COLUMN_META = {
  todo: { title: 'To Do' },
  doing: { title: 'Doing' },
  done: { title: 'Done' },
};

/*
 * Priority is the task's own property now, chosen when it is created and
 * editable afterwards. It used to be derived from the column, which is why a
 * card in Doing read "In Progress" — that said nothing the column did not
 * already say.
 */
const PRIORITIES = {
  high: { label: 'High', bg: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' },
  medium: { label: 'Medium', bg: colors.yellow100, color: colors.yellow900, border: `1px solid ${colors.yellow300}` },
  low: { label: 'Low', bg: colors.gray100, color: colors.gray600, border: `1px solid ${colors.gray300}` },
};

const DEFAULT_PRIORITY = 'medium';

// Tasks created before priorities existed carry free text like "In Progress",
// so anything unrecognised falls back rather than rendering a blank badge.
const priorityOf = (task) => (PRIORITIES[task.priority] ? task.priority : DEFAULT_PRIORITY);

// A finished task is muted whatever its priority — the column is the news.
const badgeFor = (task, isDone) => {
  const priority = PRIORITIES[priorityOf(task)];
  return isDone
    ? { label: priority.label, bg: colors.white, color: colors.gray600, border: `1px solid ${colors.gray300}`, icon: true }
    : priority;
};

const ColumnHeader = ({ title, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
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

// Demo mode has no server to hand back an _id, so a card needs a local one to
// be addressed by. Module scope keeps the impure call out of the component.
const localTaskId = () => `local-${Date.now()}`;

const fieldStyle = {
  width: '100%',
  borderRadius: '8px',
  border: `1px solid ${colors.gray300}`,
  padding: '8px 10px',
  fontSize: '14px',
  color: colors.black,
  backgroundColor: colors.white,
  outline: 'none',
};

/*
 * The one place a task's title, description and priority are entered, used both
 * for a new card and for editing an existing one. Inline rather than a modal so
 * it appears in the column it belongs to, and so priority can be a real select
 * instead of a typed answer to a prompt.
 */
const TaskForm = ({ task, submitLabel, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task ? priorityOf(task) : DEFAULT_PRIORITY);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, description: description.trim(), priority });
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        borderRadius: '12px',
        border: `1px solid ${colors.gray300}`,
        backgroundColor: colors.white,
        padding: '12px',
        boxShadow: shadowSm,
      }}
    >
      <input
        className="cb-input"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        maxLength={140}
        required
        style={fieldStyle}
      />
      <input
        className="cb-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        maxLength={2000}
        style={fieldStyle}
      />

      <label style={{ fontSize: '13px', fontWeight: '600', color: colors.gray600 }}>
        Priority
        <select
          className="cb-input"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ ...fieldStyle, marginTop: '4px' }}
        >
          {Object.entries(PRIORITIES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
        <button
          type="button"
          className="cb-task-action"
          onClick={onCancel}
          style={{ ...actionButtonStyle, color: colors.gray500 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="cb-new-task"
          style={{
            ...actionButtonStyle,
            backgroundColor: colors.yellow400,
            color: colors.black,
            padding: '6px 14px',
          }}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
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
        onClick={onEdit}
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

export const BoardView = ({ boardId, board, submitAction }) => {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const [error, setError] = useState('');
  // The column whose "Add Task" form is open, and the task being edited — at
  // most one of each, so a form never appears in two places at once.
  const [addingTo, setAddingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Keep the board in sync with real-time task events from other clients.
  useBoardSockets(boardId, dispatch);

  const loadTasks = useCallback(async () => {
    if (DEMO_MODE) return;
    dispatch({ type: 'BOARD_CHANGED' });
    try {
      const { columns } = await api(`/boards/${boardId}/tasks`);
      dispatch({ type: 'TASKS_LOADED', payload: columns });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [boardId]);

  // Tasks belong to the board in the URL, so switching tabs refetches rather
  // than carrying the previous board's cards across.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async (status, { title, description, priority }) => {
    setAddingTo(null);

    if (DEMO_MODE) {
      const draft = { id: localTaskId(), title, description, status, priority };
      dispatch({ type: 'TASK_CREATED', payload: draft });
      if (submitAction) await submitAction({ type: 'CREATE_TASK', status, task: draft });
      return;
    }

    try {
      const { task } = await api(`/boards/${boardId}/tasks`, {
        method: 'POST',
        body: { title, description, status, priority },
      });
      // Dispatched with the server's task, so the card carries the real _id
      // that every later edit is addressed by.
      dispatch({ type: 'TASK_CREATED', payload: task });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditTask = async (task, { title, description, priority }) => {
    setEditingId(null);
    const updated = { ...task, title, description, priority };

    // Show the edit immediately; the server is the authority on what stuck.
    dispatch({ type: 'TASK_UPDATED', payload: updated });

    if (DEMO_MODE) {
      if (submitAction) await submitAction({ type: 'UPDATE_TASK', taskId: task.id || task._id, task: updated });
      return;
    }

    try {
      const saved = await api(`/boards/${boardId}/tasks/${task._id}`, {
        method: 'PATCH',
        /*
         * The version this edit was written against. If someone else saved
         * first the server answers 409 and writes nothing, rather than letting
         * this edit erase theirs — the task's `version` is what makes the two
         * writes distinguishable.
         */
        body: { title, description, priority, expectedVersion: task.version },
      });
      dispatch({ type: 'TASK_UPDATED', payload: saved.task });
      setError('');
    } catch (err) {
      // A rejected edit: put the server's version on the board so what is shown
      // is what was actually saved, and say so rather than leaving the edit
      // looking like it stuck.
      if (err.status === 409 && err.data?.latest) {
        dispatch({ type: 'TASK_UPDATED', payload: err.data.latest });
        setError(`${err.message} Your change was not saved.`);
        return;
      }

      setError(err.message);
      loadTasks();
    }
  };

  const handleMoveTask = async (task, from, to) => {
    if (from === to) return;
    const taskId = task.id || task._id;

    // Priority is the task's own, so a move changes the column and nothing else.
    dispatch({ type: 'TASK_MOVED', payload: { taskId, from, to } });

    if (DEMO_MODE) {
      if (submitAction) await submitAction({ type: 'MOVE_TASK', taskId, from, to });
      return;
    }

    try {
      await api(`/boards/${boardId}/tasks/${task._id}`, {
        method: 'PATCH',
        body: { status: to },
      });
      setError('');
    } catch (err) {
      setError(err.message);
      loadTasks();
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const taskId = task.id || task._id;

    dispatch({ type: 'TASK_DELETED', payload: taskId });

    if (DEMO_MODE) {
      if (submitAction) await submitAction({ type: 'DELETE_TASK', taskId });
      return;
    }

    try {
      await api(`/boards/${boardId}/tasks/${task._id}`, { method: 'DELETE' });
      setError('');
    } catch (err) {
      setError(err.message);
      loadTasks();
    }
  };

  return (
    <div>
      {/* Board Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-0.025em', color: colors.black }}>
          {board?.name || 'Board'}
        </h2>
        {board?.description && (
          <p style={{ marginTop: '4px', color: colors.gray500 }}>{board.description}</p>
        )}
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

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
                {tasks.map((task) => {
                  const taskId = task.id || task._id;

                  // The form replaces the card it edits, so the values being
                  // changed stay where the card was.
                  return taskId === editingId ? (
                    <TaskForm
                      key={taskId}
                      task={task}
                      submitLabel="Save"
                      onSubmit={(values) => handleEditTask(task, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <TaskCard
                      key={taskId}
                      task={task}
                      badge={badgeFor(task, status === 'done')}
                      isDone={status === 'done'}
                      status={status}
                      onEdit={() => setEditingId(taskId)}
                      onMove={handleMoveTask}
                      onDelete={handleDeleteTask}
                    />
                  );
                })}

                {addingTo === status ? (
                  <TaskForm
                    submitLabel="Add task"
                    onSubmit={(values) => handleAddTask(status, values)}
                    onCancel={() => setAddingTo(null)}
                  />
                ) : (
                  <AddTaskButton onClick={() => setAddingTo(status)} />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
