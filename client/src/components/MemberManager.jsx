import { useCallback, useEffect, useState } from 'react';
import { DEMO_MODE, DEMO_MEMBERS } from '../demo/demoMode';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export const MemberManager = ({ boardId, initialMembers = [] }) => {
  const [members, setMembers] = useState(
    DEMO_MODE && initialMembers.length === 0 ? DEMO_MEMBERS : initialMembers
  );
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [inviting, setInviting] = useState(false);

  // Reads a JSON response and throws the server's own message on a failure, so
  // every handler below reports what the API actually said.
  const readJson = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data;
  };

  // `loading` starts true, so this never has to set it on the way in — which
  // also keeps the effect below from triggering a cascading render.
  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/members`, { headers: authHeaders() });
      const data = await readJson(res);
      setMembers(data.members);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // The board's membership lives in MongoDB, so load it on mount rather than
  // starting from whatever the caller passed in.
  useEffect(() => {
    // Every setState in loadMembers runs after the awaited fetch, not
    // synchronously on mount, so the cascading-render warning does not apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!DEMO_MODE) loadMembers();
  }, [loadMembers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setStatus('');

    const typed = email.trim().toLowerCase();

    if (DEMO_MODE) {
      setMembers((prev) => [...prev, { _id: `demo-${Date.now()}`, email: typed }]);
      setEmail('');
      setStatus('Member added successfully.');
      return;
    }

    setInviting(true);

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email: typed }),
      });

      // 404 -> 'User not found.', 409 -> already a member; both are written to
      // be shown to the user as-is.
      const data = await readJson(res);

      setMembers((prev) => [...prev, data.user]);
      setEmail('');
      setStatus(`${data.user.name} added to the board.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    const previous = members;
    const member = members.find((m) => m._id === memberId);
    const label = member?.name || member?.email || 'Member';

    // Drop the row immediately; put it back only if the server refuses.
    setMembers((prev) => prev.filter((m) => m._id !== memberId));
    setStatus('');

    if (DEMO_MODE) {
      setStatus(`${label} removed from the board.`);
      return;
    }

    try {
      // Removes the membership only — the account stays in the users
      // collection and can be invited back.
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      await readJson(res);
      setStatus(`${label} removed from the board.`);
    } catch (err) {
      setMembers(previous);
      setStatus(err.message);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f9f9f9', 
      borderRadius: '12px', 
      padding: '24px', 
      border: '1px solid #d4d4d4', 
      maxWidth: '450px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1a1a1a' }}>Board Members</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666' }}>Manage who has access to this board.</p>
      
      {status && (
        <div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#e6e6e6', borderRadius: '6px', fontSize: '13px', color: '#333' }}>
          {status}
        </div>
      )}

      {/* Member List */}
      {loading && (
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#666' }}>Loading members...</p>
      )}
      {!loading && members.length === 0 && (
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#666' }}>
          No members yet. Invite someone by their email address below.
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
        {members.map((m) => (
          <li key={m._id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 0',
            borderBottom: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: '#dcdcdc', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                fontSize: '14px',
                color: '#555'
              }}>
                {m.name ? m.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                {m.name || m.email}
              </span>
            </div>
            <button 
              onClick={() => handleRemove(m._id)} 
              style={{ 
                fontSize: '13px', 
                color: '#d9534f', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* Add Member Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px' }}>
        <input
          type="email"
          placeholder="Enter email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ 
            flex: 1,
            backgroundColor: '#fff', 
            border: '1px solid #d0d0d0',
            borderRadius: '6px', 
            padding: '10px 14px',
            fontSize: '14px',
            color: '#333',
            outline: 'none'
          }}
        />
        <button 
          type="submit"
          disabled={inviting}
          style={{ 
            backgroundColor: '#ebd673', 
            border: 'none', 
            padding: '10px 16px', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            fontSize: '14px',
            cursor: 'pointer',
            color: '#1a1a1a',
            opacity: inviting ? 0.6 : 1
          }}
        >
          {inviting ? 'Checking...' : 'Invite'}
        </button>
      </form>
    </div>
  );
};