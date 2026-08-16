import { useState } from 'react';
import './App.css';
import { useBoardPersistence } from './utils/hooks/useBoardPersistence';
import { NetworkStatusBar } from './utils/hooks/components/NetworkStatusBar';

const initialBoard = {
  id: 'q3-roadmap', title: 'Q3 Roadmap', subtitle: 'Manage all upcoming features and fixes.',
  columns: [
    { id: 'todo', title: 'To Do', tasks: [{ id: 't1', title: 'test1', description: 'test1', badge: 'High Priority', kind: 'priority' }] },
    { id: 'doing', title: 'Doing', tasks: [{ id: 't2', title: 'test2', description: 'test2', badge: 'In Progress', kind: 'progress' }] },
    { id: 'done', title: 'Done', tasks: [{ id: 't3', title: 'test3', description: 'test3', badge: 'Completed', kind: 'complete', date: 'Oct 12' }] },
  ],
};

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }

function App() {
  const { board, saveBoard, submitAction, isOnline, isSyncing, message } = useBoardPersistence('q3-roadmap', initialBoard);
  const [query, setQuery] = useState('');

  const addTask = (columnId = 'todo') => {
    const title = window.prompt('Task title');
    if (!title?.trim()) return;
    const task = { id: `task-${Date.now()}`, title: title.trim(), description: 'New task', badge: columnId === 'todo' ? 'High Priority' : 'In Progress', kind: columnId === 'todo' ? 'priority' : 'progress' };
    saveBoard((current) => ({ ...current, columns: current.columns.map((column) => column.id === columnId ? { ...column, tasks: [...column.tasks, task] } : column) }));
    submitAction({ type: 'TASK_CREATED', columnId, task });
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">CollabBoard</div>
      <label className="search"><Icon>⌕</Icon><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search boards, tasks..." /></label>
      <button className="profile" aria-label="Profile">♙</button>
    </header>
    <NetworkStatusBar isOnline={isOnline} isSyncing={isSyncing} message={message} />
    <div className="workspace">
      <aside className="sidebar">
        <div className="team"><span className="team-badge">G13</span><div><strong>Group 13</strong><small>Marketing Project</small></div></div>
        <nav><button className="active"><Icon>▦</Icon> Boards</button><button><Icon>♧</Icon> Members</button><button><Icon>⚙</Icon> Settings</button></nav>
      </aside>
      <main>
        <div className="board-heading"><div><h1>{board.title}</h1><p>{board.subtitle}</p></div><button className="new-task" onClick={() => addTask()}>＋ New Task</button></div>
        <div className="columns">
          {board.columns.map((column) => {
            const tasks = column.tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase()));
            return <section className="column" key={column.id}>
              <div className="column-title"><div><h2>{column.title}</h2><span>{column.tasks.length}</span></div><button aria-label="Column options">•••</button></div>
              <div className="cards">{tasks.map((task) => <article className={`card ${task.kind === 'complete' ? 'done' : ''}`} key={task.id}>
                <div className="card-top"><span className={`badge ${task.kind}`}>{task.kind === 'complete' ? '◉ ' : ''}{task.badge}</span><button aria-label={`Edit ${task.title}`}>♢</button></div>
                <h3>{task.title}</h3><p>{task.description}</p>{task.date && <small>{task.date}</small>}
              </article>)}
              <button className="add-task" onClick={() => addTask(column.id)}>＋ &nbsp; Add Task</button></div>
            </section>;
          })}
        </div>
      </main>
    </div>
  </div>;
}
export default App;
