import { useState } from 'react';
import { DEMO_MODE, DEMO_MEMBERS } from '../demo/demoMode';

// `boardId` is still passed by App.jsx but is not read: nothing here talks to a
// board endpoint yet. Destructure it again when the board API lands.
export const MemberManager = ({ initialMembers = [] }) => {
  // No GET /members endpoint exists yet, so seed the list for the demo.
  const [members, setMembers] = useState(
    DEMO_MODE && initialMembers.length === 0 ? DEMO_MEMBERS : initialMembers
  );
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [inviting, setInviting] = useState(false);

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

    if (members.some((m) => m.email?.toLowerCase() === typed)) {
      setStatus('That user is already a member of this board.');
      return;
    }

    setInviting(true);

    try {
      // There is no board membership endpoint yet, so the invite resolves the
      // address to a registered account and holds the result in local state.
      // Swap this for POST /api/boards/:id/members once boards are persisted.
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(typed)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // The server sends 'User not found.' for a 404; anything else it says is
      // already written to be shown as-is.
      if (!res.ok) throw new Error(data.message || 'Unable to add that member.');

      setMembers((prev) => [...prev, data.user]);
      setEmail('');
      setStatus(`${data.user.name} added to the board.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = (memberId) => {
    const member = members.find((m) => m._id === memberId);

    // Membership lives in this component's state — there is no board API to
    // call, and no DELETE that would succeed. Removing a member only drops them
    // from this list; their account in the users collection is untouched.
    // Swap this for DELETE /api/boards/:id/members/:id once boards are persisted.
    setMembers((prev) => prev.filter((m) => m._id !== memberId));
    setStatus(`${member?.name || member?.email || 'Member'} removed from the board.`);
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