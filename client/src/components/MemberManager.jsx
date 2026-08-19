import { useState } from 'react';

export const MemberManager = ({ boardId, initialMembers = [] }) => {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('User not found or unable to add');
      const addedUser = await res.json();

      setMembers((prev) => [...prev, addedUser]);
      setEmail('');
      setStatus('Member added successfully.');
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleRemove = async (memberId) => {
    const previous = [...members];
    setMembers((prev) => prev.filter((m) => m._id !== memberId));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to remove member on server');
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
          style={{ 
            backgroundColor: '#ebd673', 
            border: 'none', 
            padding: '10px 16px', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            fontSize: '14px',
            cursor: 'pointer',
            color: '#1a1a1a'
          }}
        >
          Invite
        </button>
      </form>
    </div>
  );
};