const API_URL = '/api/boards';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const fetchBoardsAPI = async () => {
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Network error fetching boards');
    const data = await res.json();
    
    // Save to local cache for offline persistence
    localStorage.setItem('cached_boards', JSON.stringify(data));
    return data;
  } catch (err) {
    // Fallback to cache if network fails
    const cached = localStorage.getItem('cached_boards');
    if (cached) return JSON.parse(cached);
    throw err;
  }
};

export const createBoardAPI = async (title) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create board');
  return res.json();
};