import { useCallback, useEffect, useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { api } from '../api';
import { DEMO_MODE, DEMO_MEMBERS } from '../demo/demoMode';
import { colors, shadowSm } from '../theme';

/*
 * Who can open a board, and the invite form that changes it.
 *
 * Membership lives in MongoDB, so the list is loaded from the server on mount
 * rather than trusted from whatever the caller passed in. Adding someone here
 * is what puts the board on their own boards page — the server answers
 * GET /boards with every board the caller is a member of, so the invitee sees
 * it the next time they sign in.
 */
export const MemberManager = ({ boardId, board, initialMembers = [] }) => {
  const [members, setMembers] = useState(
    DEMO_MODE && initialMembers.length === 0 ? DEMO_MEMBERS : initialMembers
  );
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [inviting, setInviting] = useState(false);

  const say = (text, tone = 'info') => setStatus({ text, tone });

  // `loading` starts true, so this never has to set it on the way in — which
  // also keeps the effect below from triggering a cascading render.
  const loadMembers = useCallback(async () => {
    try {
      const { members: loaded } = await api(`/boards/${boardId}/members`);
      setMembers(loaded);
    } catch (err) {
      setStatus({ text: err.message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Switching boards reloads the list rather than carrying the previous board's
  // members across.
  useEffect(() => {
    // Every setState in loadMembers runs after the awaited fetch, not
    // synchronously on mount, so the cascading-render warning does not apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!DEMO_MODE) loadMembers();
  }, [loadMembers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setStatus(null);

    const typed = email.trim().toLowerCase();

    if (DEMO_MODE) {
      setMembers((prev) => [...prev, { _id: demoMemberId(), email: typed }]);
      setEmail('');
      say('Member added successfully.', 'success');
      return;
    }

    setInviting(true);

    try {
      // 404 -> 'User not found.', 409 -> already a member; both are written to
      // be shown to the user as-is.
      const { user } = await api(`/boards/${boardId}/members`, {
        method: 'POST',
        body: { email: typed },
      });

      setMembers((prev) => [...prev, user]);
      setEmail('');
      say(`${user.name} can now open ${board?.name || 'this board'}.`, 'success');
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    const previous = members;
    const member = members.find((m) => m._id === memberId);
    const label = member?.name || member?.email || 'Member';

    if (!window.confirm(`Remove ${label} from ${board?.name || 'this board'}?`)) return;

    // Drop the row immediately; put it back only if the server refuses.
    setMembers((prev) => prev.filter((m) => m._id !== memberId));
    setStatus(null);

    if (DEMO_MODE) {
      say(`${label} removed from the board.`, 'success');
      return;
    }

    try {
      // Removes the membership only — the account stays in the users
      // collection and can be invited back.
      await api(`/boards/${boardId}/members/${memberId}`, { method: 'DELETE' });
      say(`${label} removed from the board.`, 'success');
    } catch (err) {
      setMembers(previous);
      say(err.message, 'error');
    }
  };

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <h3 style={styles.title}>{board?.name || 'Board'} members</h3>
        <p style={styles.subtitle}>
          {board?.description
            ? board.description
            : 'Everyone listed here can open this board and edit its tasks.'}
        </p>
      </header>

      {status && (
        <p
          style={{
            ...styles.status,
            ...(status.tone === 'error' ? styles.statusError : null),
            ...(status.tone === 'success' ? styles.statusSuccess : null),
          }}
        >
          {status.text}
        </p>
      )}

      {loading && <p style={styles.empty}>Loading members...</p>}
      {!loading && members.length === 0 && (
        <p style={styles.empty}>No members yet. Invite someone by their email address below.</p>
      )}

      <ul style={styles.list}>
        {members.map((member) => {
          const locked = isGroupLeader(member, board);

          return (
            <li key={member._id} style={styles.row}>
              <div style={styles.identity}>
                <span style={styles.avatar}>
                  {(member.name || member.email || '?').charAt(0).toUpperCase()}
                </span>
                <span>
                  <span style={styles.name}>
                    {member.name || member.email}
                    {locked && <span style={styles.leaderTag}>Group leader</span>}
                  </span>
                  {member.name && <span style={styles.email}>{member.email}</span>}
                </span>
              </div>

              {/* The server refuses to remove the owner, so the button says so
                  up front rather than letting the click fail. */}
              <button
                type="button"
                onClick={() => handleRemove(member._id)}
                disabled={locked}
                aria-disabled={locked}
                aria-label={`Remove ${member.name || member.email}`}
                title={locked ? 'The group leader cannot be removed from the board.' : undefined}
                className={`cb-member-remove${locked ? ' cb-disabled' : ''}`}
                style={{ ...styles.remove, ...(locked ? styles.removeDisabled : null) }}
              >
                <UserMinus size={14} />
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAdd} style={styles.form}>
        <input
          className="cb-input"
          type="email"
          placeholder="Invite by email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" disabled={inviting} className="cb-new-task" style={styles.invite}>
          <UserPlus size={16} />
          {inviting ? 'Checking...' : 'Invite'}
        </button>
      </form>

      <p style={styles.hint}>
        The person must already have a CollabBoard account. Once invited, the board appears on
        their own boards page when they sign in.
      </p>
    </section>
  );
};

/*
 * The one member who cannot be removed: the board's owner, and the admin
 * account the server treats as the group leader. Both are refused server-side
 * (403), so this only decides whether the button is offered at all.
 */
const isGroupLeader = (member, board) =>
  Boolean(member.isAdmin) || (Boolean(board?.owner) && member._id === board.owner);

// Demo mode has no server to hand back an _id. Module scope keeps the impure
// call out of the component.
const demoMemberId = () => `demo-${Date.now()}`;

const styles = {
  panel: {
    maxWidth: '520px',
    padding: '24px',
    borderRadius: '16px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
    boxShadow: shadowSm,
  },
  header: { marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: colors.black },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: colors.gray500 },
  status: {
    margin: '0 0 16px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.gray50,
    fontSize: '13px',
    color: colors.gray600,
  },
  statusSuccess: {
    backgroundColor: colors.yellow50,
    border: `1px solid ${colors.yellow200}`,
    color: colors.yellow900,
  },
  statusError: { backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626' },
  empty: { margin: '0 0 20px', fontSize: '13px', color: colors.gray500 },
  list: { listStyle: 'none', padding: 0, margin: '0 0 20px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  identity: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  avatar: {
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: colors.gray100,
    border: `1px solid ${colors.gray200}`,
    color: colors.gray600,
    fontSize: '14px',
    fontWeight: 'bold',
  },
  name: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.black,
  },
  leaderTag: {
    padding: '1px 8px',
    borderRadius: '9999px',
    backgroundColor: colors.gray100,
    border: `1px solid ${colors.gray200}`,
    fontSize: '11px',
    fontWeight: '600',
    color: colors.gray500,
    whiteSpace: 'nowrap',
  },
  email: { display: 'block', fontSize: '12px', color: colors.gray500 },
  remove: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'background-color 150ms',
  },
  removeDisabled: { color: colors.gray400, cursor: 'not-allowed' },
  form: { display: 'flex', gap: '8px' },
  input: {
    flex: 1,
    minWidth: 0,
    borderRadius: '8px',
    border: `1px solid ${colors.gray300}`,
    padding: '10px 14px',
    fontSize: '14px',
    color: colors.black,
    backgroundColor: colors.white,
    outline: 'none',
  },
  invite: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.yellow400,
    fontSize: '14px',
    fontWeight: '600',
    color: colors.black,
    cursor: 'pointer',
  },
  hint: { margin: '12px 0 0', fontSize: '12px', color: colors.gray400 },
};
