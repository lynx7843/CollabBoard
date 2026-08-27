import { useContext, useEffect, useRef, useState } from 'react';
import { Search, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { colors, shadowSm } from '../theme';

export const Navbar = () => {
  const { user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  // Wraps both the trigger and the popup, so a click on the button itself is
  // "inside" and does not race the toggle below by closing and reopening.
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header style={styles.header}>
      <h1 style={styles.brand}>CollabBoard</h1>

      <div style={styles.searchWrap}>
        <Search size={20} style={styles.searchIcon} />
        <input
          className="cb-search"
          type="text"
          placeholder="Search boards, tasks..."
          style={styles.searchInput}
        />
      </div>

      <div ref={menuRef} style={styles.profileWrap}>
        <button
          type="button"
          aria-label="Profile"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="cb-profile"
          style={styles.avatarButton}
        >
          <User size={20} />
        </button>

        {menuOpen && (
          <div role="menu" aria-label="Account" style={styles.menu}>
            {/* The same placeholder avatar as the trigger, scaled up. */}
            <div style={styles.menuAvatar}>
              <User size={32} />
            </div>

            <p style={styles.menuName}>{user?.name || user?.username || 'Signed in'}</p>
            <p style={styles.menuEmail}>{user?.email || 'No email on file'}</p>

            <button
              type="button"
              role="menuitem"
              disabled
              title="Coming soon"
              style={styles.manageButton}
            >
              Manage account
              <span style={styles.comingSoon}>Coming soon</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    height: '80px',
    flexShrink: 0,
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  brand: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '-0.025em',
    color: colors.black,
  },
  searchWrap: { position: 'relative', flex: '1 1 auto', maxWidth: '576px', margin: '0 32px' },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: colors.gray400,
  },
  searchInput: {
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${colors.gray300}`,
    backgroundColor: colors.white,
    padding: '12px 16px 12px 48px',
    fontSize: '14px',
    color: colors.black,
    outline: 'none',
  },
  profileWrap: { position: 'relative', flexShrink: 0 },
  avatarButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: colors.gray100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: `1px solid ${colors.gray300}`,
    color: colors.gray500,
    cursor: 'pointer',
    transition: 'background-color 150ms',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    zIndex: 50,
    width: '288px',
    padding: '24px 20px 20px',
    borderRadius: '16px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
    boxShadow: '0 12px 32px rgb(0 0 0 / 0.12)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  menuAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    color: colors.gray500,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuName: {
    margin: '16px 0 0',
    fontSize: '16px',
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    wordBreak: 'break-word',
  },
  menuEmail: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: colors.gray500,
    textAlign: 'center',
    wordBreak: 'break-word',
  },
  manageButton: {
    marginTop: '20px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '999px',
    border: `1px solid ${colors.gray300}`,
    backgroundColor: colors.white,
    fontSize: '14px',
    fontWeight: '600',
    color: colors.gray500,
    cursor: 'not-allowed',
    boxShadow: shadowSm,
  },
  comingSoon: {
    padding: '2px 8px',
    borderRadius: '999px',
    backgroundColor: colors.yellow100,
    border: `1px solid ${colors.yellow200}`,
    fontSize: '11px',
    fontWeight: '600',
    color: colors.yellow900,
  },
};
