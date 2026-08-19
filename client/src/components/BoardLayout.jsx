import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const BoardLayout = ({ children }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#e6e6e6', 
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ 
          flex: 1, 
          overflowX: 'auto', 
          overflowY: 'auto', 
          padding: '40px' 
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};