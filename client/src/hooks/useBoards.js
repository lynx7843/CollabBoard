import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { DEMO_MODE } from '../demo/demoMode';

// Mirrors the board the demo stubs assume, so the tab strip has something to
// render when there is no server to ask.
const DEMO_BOARDS = [
  { _id: 'demo-board', slug: 'group-13', name: 'Group 13', description: 'Fullstack Project' },
];

/*
 * The signed-in user's boards — the source of the tab strip.
 *
 * Loaded from the server rather than kept in component state, so the open tabs
 * survive a reload. `canCreate` comes from the server too: it is false for
 * everyone but the admin, and false for the admin once the cap is reached.
 */
export function useBoards() {
  const [boards, setBoards] = useState(DEMO_MODE ? DEMO_BOARDS : []);
  const [canCreate, setCanCreate] = useState(false);
  const [maxBoards, setMaxBoards] = useState(5);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (DEMO_MODE) return;
    try {
      const data = await api('/boards');
      setBoards(data.boards);
      setCanCreate(data.canCreate);
      setMaxBoards(data.maxBoards);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const createBoard = useCallback(async ({ name, description }) => {
    const { board } = await api('/boards', { method: 'POST', body: { name, description } });
    await refresh();
    return board;
  }, [refresh]);

  const deleteBoard = useCallback(async (slug) => {
    await api(`/boards/${slug}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { boards, canCreate, maxBoards, loading, error, refresh, createBoard, deleteBoard };
}
