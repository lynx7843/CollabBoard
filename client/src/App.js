import React, { useState } from 'react';

function App() {
  
  const [tasks, setTasks] = useState([
    { id: 1, title: 'test1', description: 'test1', status: 'todo', priority: 'High Priority' },
    { id: 2, title: 'test2', description: 'test2', status: 'doing', priority: 'In Progress' },
    { id: 3, title: 'test3', description: 'test3', status: 'done', priority: 'Completed', date: 'Oct 12' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'todo', label: 'To Do' },
    { key: 'doing', label: 'Doing' },
    { key: 'done', label: 'Done' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f5f7', fontFamily: 'sans-serif', margin: 0 }}>
      
      <div style={{ width: '240px', background: '#eaeef2', padding: '20px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>CollabBoard</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px' }}>
          <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>G13</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Group 13</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Marketing Project</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ background: '#e2e8f0', padding: '10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>📋 Boards</div>
          <div style={{ padding: '10px', borderRadius: '6px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>👥 Members</div>
          <div style={{ padding: '10px', borderRadius: '6px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>⚙️ Settings</div>
        </div>
      </div>

      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        <div style={{ height: '60px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search boards, tasks..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', background: '#f9fafb' }}
          />
          <div style={{ width: '35px', height: '35px', background: '#ddd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>👤</div>
        </div>

        <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#111' }}>Q3 Roadmap</h1>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Manage all upcoming features and fixes.</p>
          </div>
          <button style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            + New Task
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', padding: '0 30px 30px 30px' }}>
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.key);

            return (
              <div key={col.key} style={{ flex: 1, background: '#e9ecef', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    {col.label} 
                    <span style={{ background: '#d1d5db', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{colTasks.length}</span>
                  </div>
                  <span style={{ cursor: 'pointer', color: '#666', fontWeight: 'bold' }}>...</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                  {colTasks.map(task => (
                    <div key={task.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ 
                          background: task.priority === 'High Priority' ? '#fef3c7' : task.priority === 'In Progress' ? '#000' : '#e5e7eb', 
                          color: task.priority === 'In Progress' ? '#fff' : '#92400e', 
                          padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' 
                        }}>
                          {task.priority}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ cursor: 'pointer', fontSize: '12px' }}>✏️</span>
                          <span onClick={() => handleDelete(task.id)} style={{ cursor: 'pointer', fontSize: '12px', color: 'red' }} title="Delete">🗑️</span>
                        </div>
                      </div>

                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{task.title}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{task.description}</div>
                      {task.date && <div style={{ fontSize: '11px', color: '#999' }}>{task.date}</div>}

                    </div>
                  ))}
                </div>

                <button style={{ marginTop: '15px', background: 'transparent', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', color: '#64748b', cursor: 'pointer', width: '100%', fontWeight: '500' }}>
                  + Add Task
                </button>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

export default App;