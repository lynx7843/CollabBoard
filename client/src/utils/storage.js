/*
 * What the board keeps on the device.
 *
 * Two jobs, both about surviving a refresh or a brief network loss:
 *
 *   - a cache of what was last seen, so a board still renders when the API
 *     cannot be reached;
 *   - a queue of changes made while it could not be reached, replayed in order
 *     once it can (useBoardPersistence.syncQueue).
 *
 * Everything is best-effort. localStorage throws when it is full or disabled
 * (private windows), and a board that cannot cache is still a working board, so
 * every failure here is swallowed rather than raised.
 */
const TASKS_CACHE_PREFIX = 'collabboard_tasks_';
const BOARD_LIST_KEY = 'collabboard_boards';
const QUEUE_KEY = 'collabboard_offline_action_queue';

const available = () => typeof window !== 'undefined' && window.localStorage;

const read = (key) => {
  if (!available()) return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to read ${key} from storage:`, error);
    return null;
  }
};

const write = (key, value) => {
  if (!available()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write ${key} to storage:`, error);
    return false;
  }
};

// The three columns as the board reducer holds them, per board.
export const cacheBoardTasks = (boardId, columns) =>
  write(`${TASKS_CACHE_PREFIX}${boardId}`, { columns, cachedAt: new Date().toISOString() });

export const getCachedBoardTasks = (boardId) => read(`${TASKS_CACHE_PREFIX}${boardId}`)?.columns || null;

export const getBoardTasksCachedAt = (boardId) => read(`${TASKS_CACHE_PREFIX}${boardId}`)?.cachedAt || null;

// The tab strip. Without it a reload while offline has no board to open at all,
// and the cached tasks would have nowhere to render.
export const cacheBoardList = (payload) => write(BOARD_LIST_KEY, { ...payload, cachedAt: new Date().toISOString() });

export const getCachedBoardList = () => read(BOARD_LIST_KEY);

export const getOfflineQueue = () => {
  const queue = read(QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
};

export const queueOfflineAction = (action) => {
  const queue = getOfflineQueue();
  const queued = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...action,
    queuedAt: new Date().toISOString(),
  };
  write(QUEUE_KEY, [...queue, queued]);
  return queued;
};

export const replaceOfflineQueue = (actions) => write(QUEUE_KEY, actions);

export const removeQueuedAction = (id) => replaceOfflineQueue(getOfflineQueue().filter((a) => a.id !== id));
