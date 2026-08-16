const BOARD_CACHE_PREFIX = 'collabboard_board_';
const QUEUE_KEY = 'collabboard_offline_action_queue';
const available = () => typeof window !== 'undefined' && window.localStorage;

export const cacheBoardData = (boardId, data) => {
  if (!available()) return false;
  try {
    localStorage.setItem(`${BOARD_CACHE_PREFIX}${boardId}`, JSON.stringify({ data, cachedAt: new Date().toISOString() }));
    return true;
  } catch (error) { console.error('Failed to cache board data:', error); return false; }
};

export const getCachedBoardData = (boardId) => {
  if (!available()) return null;
  try {
    const item = localStorage.getItem(`${BOARD_CACHE_PREFIX}${boardId}`);
    return item ? JSON.parse(item).data : null;
  } catch (error) { console.error('Failed to read board cache:', error); return null; }
};

export const getOfflineQueue = () => {
  if (!available()) return [];
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(queue) ? queue : [];
  } catch (error) { return []; }
};

export const queueOfflineAction = (action) => {
  if (!available()) return false;
  try {
    const queue = getOfflineQueue();
    queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...action, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) { console.error('Failed to queue action:', error); return false; }
};

export const replaceOfflineQueue = (actions) => {
  if (available()) localStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
};

export const clearOfflineQueue = () => {
  if (available()) localStorage.removeItem(QUEUE_KEY);
};
