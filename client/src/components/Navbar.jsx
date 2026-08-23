import { Search, User } from 'lucide-react';
import { colors } from '../theme';

export const Navbar = () => {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 24px',
      height: '80px',
      flexShrink: 0,
      backgroundColor: colors.white,
      borderBottom: `1px solid ${colors.gray200}`
    }}>
      <h1 style={{
        margin: 0,
        fontSize: '24px',
        fontWeight: 'bold',
        letterSpacing: '-0.025em',
        color: colors.black
      }}>
        CollabBoard
      </h1>

      <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '576px', margin: '0 32px' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: colors.gray400
          }}
        />
        <input
          className="cb-search"
          type="text"
          placeholder="Search boards, tasks..."
          style={{
            width: '100%',
            borderRadius: '8px',
            border: `1px solid ${colors.gray300}`,
            backgroundColor: colors.white,
            padding: '12px 16px 12px 48px',
            fontSize: '14px',
            color: colors.black,
            outline: 'none'
          }}
        />
      </div>

      <button
        type="button"
        aria-label="Profile"
        className="cb-profile"
        style={{
          width: '40px',
          height: '40px',
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: colors.gray100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: `1px solid ${colors.gray300}`,
          color: colors.gray500,
          cursor: 'pointer',
          transition: 'background-color 150ms'
        }}
      >
        <User size={20} />
      </button>
    </header>
  );
};
