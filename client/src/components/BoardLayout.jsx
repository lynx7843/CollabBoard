import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { colors } from '../theme';

export const BoardLayout = ({ children }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: colors.white,
      color: colors.black,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          padding: '32px'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};
