import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { api } from '../api';
import { DEMO_MODE } from '../demo/demoMode';
import { DEMO_BOARDS } from '../hooks/useBoards';
import { colors, shadowSm } from '../theme';

/*
 * The demo stand-in for GET /boards/search. It can only match a board name:
 * demo tasks live in BoardView's own state and were never persisted anywhere
 * this could read them.
 */
async function demoSearch(query) {
  const typed = query.toLowerCase();
  const board = DEMO_BOARDS.find(
    (b) => b.name.toLowerCase().includes(typed) || b.slug.includes(typed),
  );

  if (!board) {
    const error = new Error('No board or task matches that search.');
    error.status = 404;
    throw error;
  }

  return { board };
}

export const Navbar = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  // What the last search said, when it did not open a board. Cleared as soon as
  // the field is edited, so a stale "no match" is never read against new text.
  const [searchError, setSearchError] = useState('');
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

  /*
   * The search bar does one thing: open a board. The server picks which one
   * (GET /boards/search — a board name wins over a task title, oldest board
   * breaks a tie), so the rule lives in one place rather than being re-derived
   * from whatever the client happens to have loaded.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    const typed = query.trim();
    if (!typed || searching) return;

    setSearchError('');
    setSearching(true);
    try {
      const { board } = DEMO_MODE
        ? await demoSearch(typed)
        : await api(`/boards/search?q=${encodeURIComponent(typed)}`);
      setQuery('');
      navigate(`/boards/${board.slug}`);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <header style={styles.header}>
      <h1 style={styles.brand}>CollabBoard</h1>

      <form onSubmit={handleSearch} role="search" style={styles.searchWrap}>
        <Search size={20} style={styles.searchIcon} />
        <input
          className="cb-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchError('');
          }}
          aria-label="Search boards and tasks"
          placeholder="Search boards, tasks..."
          style={styles.searchInput}
        />
        {searchError && <p style={styles.searchError}>{searchError}</p>}
      </form>

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

            {/* Closes the popup on the way out, so coming back from Settings
                does not find it still hanging open over the page. */}
            <Link
              role="menuitem"
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="cb-manage-account"
              style={styles.manageButton}
            >
              Manage account
            </Link>
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
  // Floated under the field rather than laid out in the bar, so a miss does not
  // shift the header's height.
  searchError: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    zIndex: 40,
    margin: 0,
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: colors.yellow50,
    border: `1px solid ${colors.yellow200}`,
    fontSize: '13px',
    color: colors.yellow900,
  },
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
    color: colors.black,
    textDecoration: 'none',
    cursor: 'pointer',
    boxShadow: shadowSm,
    transition: 'background-color 150ms, border-color 150ms',
  },
};
