import { useEffect } from 'react';
import { socket } from '../socket';
import { DEMO_MODE } from '../demo/demoMode';

// Tracks how many mounted consumers are currently using the shared socket
// singleton, so one hook instance unmounting doesn't disconnect it out from
// under another still-active instance.
let activeConsumers = 0;

export function useBoardSockets(boardId, dispatch) {
  useEffect(() => {
    // No socket server to reach yet: skip connecting so the client doesn't
    // retry :5000 forever and flood the console during the presentation.
    if (DEMO_MODE) return undefined;

    // 1. Connect on mount, disconnect only once the last consumer unmounts
    activeConsumers += 1;
    socket.connect();

    if (boardId) {
      socket.emit('join-board', boardId);
    }

    // 2. Event Listeners for Real-Time Events (named handlers so cleanup
    // only removes the listeners this hook instance added)
    const handleTaskCreated = (newTask) => {
      dispatch({ type: 'TASK_CREATED', payload: newTask });
    };

    const handleTaskUpdated = (updatedTask) => {
      dispatch({ type: 'TASK_UPDATED', payload: updatedTask });
    };

    const handleTaskDeleted = (taskId) => {
      dispatch({ type: 'TASK_DELETED', payload: taskId });
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    // 3. Cleanup on unmount
    return () => {
      if (boardId) {
        socket.emit('leave-board', boardId);
      }
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);

      activeConsumers -= 1;
      if (activeConsumers <= 0) {
        activeConsumers = 0;
        socket.disconnect();
      }
    };
  }, [boardId, dispatch]);
}