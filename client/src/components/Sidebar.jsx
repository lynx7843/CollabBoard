export const Sidebar = () => {
  return (
    <aside style={{ 
      width: '260px', 
      backgroundColor: '#e6e6e6', 
      borderRight: '1px solid #d4d4d4', 
      padding: '24px 0', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Group Header */}
      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ 
          backgroundColor: '#ebd673', 
          borderRadius: '6px', 
          width: '42px', 
          height: '42px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          fontWeight: 'bold', 
          fontSize: '14px',
          marginRight: '12px' 
        }}>
          G13
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>Group 13</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Marketing Project</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ 
          padding: '12px 24px', 
          backgroundColor: '#e8e5c8', // Light yellow active state
          display: 'flex', 
          alignItems: 'center', 
          fontWeight: '600', 
          color: '#1a1a1a',
          cursor: 'pointer',
          width: '90%',
          borderTopRightRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <span style={{ marginRight: '12px', fontSize: '18px' }}>🎛️</span> Boards
        </div>
        
        <div style={{ 
          padding: '12px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          color: '#555', 
          fontWeight: '500',
          cursor: 'pointer' 
        }}>
          <span style={{ marginRight: '12px', fontSize: '18px' }}>👥</span> Members
        </div>
        
        <div style={{ 
          padding: '12px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          color: '#555', 
          fontWeight: '500',
          cursor: 'pointer' 
        }}>
          <span style={{ marginRight: '12px', fontSize: '18px' }}>⚙️</span> Settings
        </div>
      </nav>
    </aside>
  );
};