export const Navbar = () => {
  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '0 24px', 
      height: '60px', 
      backgroundColor: '#e6e6e6', 
      borderBottom: '1px solid #d4d4d4' 
    }}>
      <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1a1a1a' }}>
        CollabBoard
      </h1>
      
      <div style={{ 
        flex: '0 1 500px', 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#dcdcdc', 
        border: '1px solid #d0d0d0',
        borderRadius: '6px', 
        padding: '8px 16px' 
      }}>
        <span style={{ marginRight: '10px', color: '#888', fontSize: '14px' }}>🔍</span>
        <input 
          type="text" 
          placeholder="Search boards, tasks..." 
          style={{ 
            border: 'none', 
            background: 'transparent', 
            outline: 'none', 
            width: '100%',
            fontSize: '14px',
            color: '#333'
          }} 
        />
      </div>

      <div style={{ 
        width: '36px', 
        height: '36px', 
        borderRadius: '50%', 
        backgroundColor: '#dcdcdc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        border: '1px solid #bcbcbc',
        color: '#555'
      }}>
        👤
      </div>
    </header>
  );
};