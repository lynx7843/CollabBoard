import React, { useReducer } from 'react';
import { boardReducer, initialState } from '../reducers/boardReducer';
import { useBoardSockets } from '../hooks/useBoardSockets';

export default function Board({ boardId = 'group-13' }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  // Socket connection & listeners
  useBoardSockets(boardId, dispatch);

  return (
    <div className="collab-layout">
      
      {/* Sidebar */}
      <aside className="collab-sidebar">
        <div>
          <div className="brand-title">CollabBoard</div>

          <div className="group-card">
            <div className="group-badge">G13</div>
            <div>
              <div className="group-name">Group 13</div>
              <div className="group-sub">Marketing Project</div>
            </div>
          </div>

          <nav className="nav-links">
            <a href="#boards" className="nav-item active">📋 Boards</a>
            <a href="#members" className="nav-item">👥 Members</a>
            <a href="#settings" className="nav-item">⚙️ Settings</a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="collab-main-container">
        
        <header className="collab-header">
          <div>
            <input 
              type="text" 
              placeholder="🔍 Search boards, tasks..." 
              className="search-input"
            />
          </div>
          <div>
            <div className="user-avatar">👤</div>
          </div>
        </header>

        <main className="collab-content">
          <div className="roadmap-header">
            <div>
              <h1 className="roadmap-title">Q3 Roadmap</h1>
              <p className="roadmap-sub">Manage all upcoming features and fixes.</p>
            </div>
            <button className="new-task-btn">+ New Task</button>
          </div>

          {/* Kanban Columns */}
          <div className="kanban-grid">
            
            {/* To Do */}
            <div className="kanban-column">
              <div className="column-header">
                <div className="column-title-area">
                  <span className="column-title">To Do</span>
                  <span className="column-count">{state.columns.todo.length}</span>
                </div>
                <span className="column-dots">...</span>
              </div>

              <div className="task-list">
                {state.columns.todo.map((task) => (
                  <div key={task.id || task._id} className="task-card">
                    <span className="priority-badge-yellow">{task.priority}</span>
                    <div className="task-title">{task.title}</div>
                    <div className="task-desc">{task.description}</div>
                    <span className="task-edit-icon">✏️</span>
                  </div>
                ))}
              </div>

              <button className="add-task-btn">+ Add Task</button>
            </div>

            {/* Doing */}
            <div className="kanban-column">
              <div className="column-header">
                <div className="column-title-area">
                  <span className="column-title">Doing</span>
                  <span className="column-count">{state.columns.doing.length}</span>
                </div>
                <span className="column-dots">...</span>
              </div>

              <div className="task-list">
                {state.columns.doing.map((task) => (
                  <div key={task.id || task._id} className="task-card">
                    <span className="priority-badge-black">{task.priority}</span>
                    <div className="task-title">{task.title}</div>
                    <div className="task-desc">{task.description}</div>
                    <span className="task-edit-icon">✏️</span>
                  </div>
                ))}
              </div>

              <button className="add-task-btn">+ Add Task</button>
            </div>

            {/* Done */}
            <div className="kanban-column">
              <div className="column-header">
                <div className="column-title-area">
                  <span className="column-title">Done</span>
                  <span className="column-count">{state.columns.done.length}</span>
                </div>
                <span className="column-dots">...</span>
              </div>

              <div className="task-list">
                {state.columns.done.map((task) => (
                  <div key={task.id || task._id} className="task-card">
                    <span className="priority-badge-done">✓ {task.priority}</span>
                    <div className="task-title">{task.title}</div>
                    <div className="task-desc">{task.description}</div>
                    {task.date && <div className="task-date">{task.date}</div>}
                    <span className="task-edit-icon">✏️</span>
                  </div>
                ))}
              </div>

              <button className="add-task-btn">+ Add Task</button>
            </div>

          </div>
        </main>
      </div>

    </div>
  );
}