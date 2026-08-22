import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * Subscribes a single board screen to real-time task events.
 *
 * Server contract (see backend Socket.io layer):
 *   emit  "join_board"   { boardId }
 *   emit  "leave_board"  { boardId }
 *   on    "task_moved"   { taskId, fromColumn, toColumn, position, version, movedBy }
 *   on    "task_updated" { task: { _id, ...fields, version }, updatedBy }
 *
 * Every task the server sends carries a `version` (incremented on each write).
 * If an incoming event's version isn't newer than what we have locally, and
 * it didn't originate from us, we treat it as a conflicting/stale update
 * instead of silently overwriting local state.
 */
export function useBoardSocket(boardId, { onConflict } = {}) {
  const { socket, status } = useSocket();
  const [tasks, setTasks] = useState({}); // { [taskId]: task }
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const setInitialTasks = useCallback((taskList) => {
    const byId = {};
    for (const t of taskList) byId[t._id] = t;
    setTasks(byId);
  }, []);

  useEffect(() => {
    if (!boardId) return;

    socket.emit("join_board", { boardId });

    const handleTaskMoved = (payload) => {
      const { taskId, toColumn, position, version } = payload;
      setTasks((prev) => {
        const existing = prev[taskId];
        if (existing && existing.version >= version) {
          // We already have this version (or newer) locally — either an
          // echo of our own optimistic move, or a stale/out-of-order event.
          onConflict?.({ type: "task_moved", local: existing, incoming: payload });
          return prev;
        }
        return {
          ...prev,
          [taskId]: { ...existing, column: toColumn, position, version },
        };
      });
    };

    const handleTaskUpdated = ({ task, updatedBy }) => {
      setTasks((prev) => {
        const existing = prev[task._id];
        if (existing && existing.version > task.version) {
          // Local copy is newer than what just arrived — don't clobber it.
          onConflict?.({ type: "task_updated", local: existing, incoming: task, updatedBy });
          return prev;
        }
        if (existing && existing.version === task.version && existing.updatedAt !== task.updatedAt) {
          // Same version number but different content: two clients wrote
          // concurrently before either had seen the other's change.
          onConflict?.({ type: "conflict", local: existing, incoming: task, updatedBy });
        }
        return { ...prev, [task._id]: task };
      });
    };

    socket.on("task_moved", handleTaskMoved);
    socket.on("task_updated", handleTaskUpdated);

    return () => {
      socket.emit("leave_board", { boardId });
      socket.off("task_moved", handleTaskMoved);
      socket.off("task_updated", handleTaskUpdated);
    };
  }, [boardId, socket, onConflict]);

  /** Optimistically apply a local move before the server confirms it. */
  const moveTaskOptimistic = useCallback((taskId, toColumn, position) => {
    setTasks((prev) => {
      const existing = prev[taskId];
      if (!existing) return prev;
      return {
        ...prev,
        [taskId]: { ...existing, column: toColumn, position, version: existing.version + 1 },
      };
    });
  }, []);

  return {
    tasks,
    tasksList: Object.values(tasks),
    setInitialTasks,
    moveTaskOptimistic,
    connectionStatus: status,
  };
}
