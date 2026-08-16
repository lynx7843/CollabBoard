import { useEffect } from 'react';
import { socket } from '../socket';

export function useBoardSockets(boardId, dispatch) {
  useEffect(() => {
    // 1. Connect on mount, disconnect on unmount
    socket.connect();

    if (boardId) {
      socket.emit('join-board', boardId);
    }

    // 2. Event Listeners for Real-Time Events
    socket.on('task:created', (newTask) => {
      dispatch({ type: 'TASK_CREATED', payload: newTask });
    });

    socket.on('task:updated', (updatedTask) => {
      dispatch({ type: 'TASK_UPDATED', payload: updatedTask });
    });

    socket.on('task:deleted', (taskId) => {
      dispatch({ type: 'TASK_DELETED', payload: taskId });
    });

    // 3. Cleanup on unmount
    return () => {
      if (boardId) {
        socket.emit('leave-board', boardId);
      }
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.disconnect();
    };
  }, [boardId, dispatch]);
}