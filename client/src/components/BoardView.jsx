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

export const BoardView = () => {

  return (
    <div>
      {/* Board Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1a1a1a' }}>Q3 Roadmap</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Manage all upcoming features and fixes.</p>
        </div>
        <button style={{ 
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
        {/* To Do Column Skeleton */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#dedede', borderRadius: '12px', padding: '16px' }}>
          <ColumnHeader title="To Do" count="1" />
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#f5eab5', color: '#8a7719', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>High Priority</span>
            <h4 style={{ margin: '12px 0 4px 0', fontSize: '15px' }}>test1</h4>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>test1</p>
          </div>
          <button style={{ width: '100%', border: '1px dashed #aaa', background: 'transparent', padding: '10px', borderRadius: '8px', color: '#666', cursor: 'pointer' }}>+ Add Task</button>
        </div>

        {/* Doing Column Skeleton */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#dedede', borderRadius: '12px', padding: '16px' }}>
          <ColumnHeader title="Doing" count="1" />
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#1a1a1a', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>In Progress</span>
            <h4 style={{ margin: '12px 0 4px 0', fontSize: '15px' }}>test2</h4>
            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>test2</p>
          </div>
          <button style={{ width: '100%', border: '1px dashed #aaa', background: 'transparent', padding: '10px', borderRadius: '8px', color: '#666', cursor: 'pointer' }}>+ Add Task</button>
        </div>

        {/* Done Column Skeleton */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#dedede', borderRadius: '12px', padding: '16px' }}>
          <ColumnHeader title="Done" count="1" />
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #ccc', marginBottom: '12px' }}>
             <span style={{ backgroundColor: '#f0f0f0', color: '#666', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #ddd' }}>✓ Completed</span>
            <h4 style={{ margin: '12px 0 4px 0', fontSize: '15px', color: '#888', textDecoration: 'line-through' }}>test3</h4>
            <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>test3 <br/> Oct 12</p>
          </div>
          <button style={{ width: '100%', border: '1px dashed #aaa', background: 'transparent', padding: '10px', borderRadius: '8px', color: '#666', cursor: 'pointer' }}>+ Add Task</button>
        </div>
      </div>
    </div>
  );
};