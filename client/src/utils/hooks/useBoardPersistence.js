import { useCallback, useEffect, useState } from 'react';
import { cacheBoardData, getCachedBoardData, getOfflineQueue, queueOfflineAction, replaceOfflineQueue } from '../storage';

export const useBoardPersistence = (boardId, fallbackBoard) => {
  const [board, setBoard] = useState(() => getCachedBoardData(boardId) || fallbackBoard);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const saveBoard = useCallback((update) => {
    setBoard((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      cacheBoardData(boardId, next);
      return next;
    });
  }, [boardId]);

  const submitAction = useCallback(async (action) => {
    if (!navigator.onLine) {
      queueOfflineAction({ boardId, ...action });
      setMessage('Change saved locally. It will sync when you reconnect.');
      return;
    }
    try {
      const response = await fetch(`/api/boards/${boardId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(action),
      });
      if (!response.ok) throw new Error();
    } catch (error) {
      queueOfflineAction({ boardId, ...action });
      setMessage('Server unavailable. Change saved locally for retry.');
    }
  }, [boardId]);

  const syncQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (!queue.length) return;
    setIsSyncing(true);
    setMessage('Connection restored. Syncing saved changes...');
    const remaining = [];
    for (const action of queue) {
      try {
        const response = await fetch(`/api/boards/${action.boardId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (!response.ok) throw new Error();
      } catch (error) { remaining.push(action); }
    }
    replaceOfflineQueue(remaining);
    setIsSyncing(false);
    setMessage(remaining.length ? `${remaining.length} change(s) still waiting to sync.` : 'All offline changes are synced.');
  }, []);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}`);
        if (!response.ok) throw new Error();
        saveBoard(await response.json());
        setMessage('');
      } catch (error) {
        if (getCachedBoardData(boardId)) setMessage('Showing the latest board saved on this device.');
      }
    };
    if (navigator.onLine) fetchBoard();
  }, [boardId, saveBoard]);

  useEffect(() => {
    const online = () => { setIsOnline(true); syncQueue(); };
    const offline = () => { setIsOnline(false); setMessage('You are offline. Changes will be saved on this device.'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [syncQueue]);

  return { board, saveBoard, submitAction, isOnline, isSyncing, message };
};
