import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, Settings, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { colors } from '../theme';

// `to` is omitted for destinations that have no route yet; those render as
// inert buttons rather than links that would bounce to the catch-all redirect.
// `to` is built per board so the Members link opens the board that is open,
// while `section` is the slugless root the highlight is decided by — signing in
// lands on /boards with no slug, which would never match a `to` carrying one.
const navItems = (slug) => [
  {
    id: 'boards',
    label: 'Boards',
    icon: LayoutGrid,
    section: '/boards',
    to: slug ? `/boards/${slug}` : '/boards',
  },
  {
    id: 'members',
    label: 'Members',
    icon: Users,
    section: '/members',
    to: slug ? `/members/${slug}` : '/members',
  },
  { id: 'settings', label: 'Settings', icon: Settings, section: '/settings', to: '/settings' },
];

// The section root itself, or a board inside it. Tested on the boundary rather
// than with startsWith alone, so a future /boards-archive is not lit up too.
const inSection = (pathname, section) =>
  Boolean(section) && (pathname === section || pathname.startsWith(`${section}/`));

const badgeStyle = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '9999px',
  backgroundColor: colors.gray100,
  border: `1px solid ${colors.gray200}`,
  color: colors.gray500,
  fontSize: '11px',
  fontWeight: '600',
  whiteSpace: 'nowrap',
};

export const Sidebar = ({ board }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const NAV_ITEMS = navItems(board?.slug);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside style={{
      width: '288px',
      flexShrink: 0,
      backgroundColor: colors.white,
      borderRight: `1px solid ${colors.gray200}`,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Group Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
          backgroundColor: colors.yellow400,
          borderRadius: '8px',
          width: '48px',
          height: '48px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          color: colors.black
        }}>
          G13
        </div>
        <div>
          <p style={{ fontWeight: 'bold', color: colors.black }}>{board?.name || 'Group 13'}</p>
          <p style={{ fontSize: '14px', color: colors.gray500 }}>
            {board?.description || 'Fullstack Project'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon, to, section, disabled, badge }) => {
          const active = inSection(location.pathname, section);
          const itemStyle = {
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '8px',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '14px',
            textDecoration: 'none',
            border: 'none',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 150ms, color 150ms',
            backgroundColor: active ? colors.yellow100 : 'transparent',
            fontWeight: active ? '600' : '500',
            color: disabled ? colors.gray400 : active ? colors.black : colors.gray600
          };
          const className = `cb-nav-item${active ? ' cb-active' : ''}${disabled ? ' cb-disabled' : ''}`;

          const content = (
            <>
              <Icon size={20} />
              {label}
              {badge && <span style={badgeStyle}>{badge}</span>}
            </>
          );

          if (disabled) {
            return (
              <button key={id} type="button" disabled aria-disabled="true" className={className} style={itemStyle}>
                {content}
              </button>
            );
          }

          return to ? (
            <Link key={id} to={to} className={className} style={itemStyle}>
              {content}
            </Link>
          ) : (
            <button key={id} type="button" className={className} style={itemStyle}>
              {content}
            </button>
          );
        })}
      </nav>

      {/* Pinned to the bottom of the sidebar */}
      <button
        type="button"
        onClick={handleLogout}
        className="cb-nav-item"
        style={{
          marginTop: 'auto',
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          gap: '12px',
          borderRadius: '8px',
          padding: '12px 16px',
          textAlign: 'left',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          background: 'transparent',
          color: colors.gray600,
          cursor: 'pointer',
          transition: 'background-color 150ms, color 150ms'
        }}
      >
        <LogOut size={20} />
        Log out
      </button>
    </aside>
  );
};
