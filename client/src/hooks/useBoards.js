import { useState, useEffect, useCallback } from 'react';
import { fetchBoardsAPI, createBoardAPI } from '../api/boardApi';

export const useBoards = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBoards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBoardsAPI();
      setBoards(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialBoards = async () => {
      try {
        const data = await fetchBoardsAPI();
        if (!cancelled) {
          setBoards(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialBoards();

    return () => {
      cancelled = true;
    };
  }, []);

  const addBoard = async (title) => {
    try {
      const created = await createBoardAPI(title);
      setBoards((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { boards, addBoard, loading, error, refreshBoards: loadBoards };
};