import { useEffect } from 'react';
import { socket } from '../socket';
import { DEMO_MODE } from '../demo/demoMode';

// Tracks how many mounted consumers are currently using the shared socket
// singleton, so one hook instance unmounting doesn't disconnect it out from
// under another still-active instance.
let activeConsumers = 0;

export function useBoardSockets(boardId, dispatch) {
  useEffect(() => {
    // Demo mode fakes the whole board in memory and there is no session to
    // authenticate the socket with, so skip connecting rather than retry the
    // API host forever and flood the console during the presentation.
    if (DEMO_MODE) return undefined;

    // 1. Connect on mount, disconnect only once the last consumer unmounts
    activeConsumers += 1;

    /*
     * Rooms live on the server's side of a connection, so a socket that drops
     * and reconnects — which it will, the API host sleeps when idle — comes
     * back knowing nothing about the board being viewed. Joining on every
     * connect rather than once on mount is what makes it pick up again.
     */
    const joinBoard = () => {
      if (boardId) socket.emit('join-board', boardId);
    };

    const handleConnectError = (err) => {
      // The server rejects a connection it cannot authenticate; without this
      // the board simply stops updating with nothing said about why.
      if (import.meta.env.DEV) {
        console.warn(`[socket] could not connect: ${err.message}`);
      }
    };

    socket.on('connect', joinBoard);
    socket.on('connect_error', handleConnectError);
    socket.connect();

    // Another board view may already hold an open connection, in which case
    // 'connect' has fired and will not fire again for this consumer.
    if (socket.connected) joinBoard();

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
      socket.off('connect', joinBoard);
      socket.off('connect_error', handleConnectError);
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