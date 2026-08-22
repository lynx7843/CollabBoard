import { useCallback, useEffect, useState } from "react";
import { useBoardSocket } from "../hooks/useBoardSocket";
import Column from "./Column";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

export default function Board({ boardId }) {
  const [conflict, setConflict] = useState(null);

  const handleConflict = useCallback((info) => {
    setConflict(info);
    // auto-dismiss the banner after a few seconds; the merged/newer
    // data is already reflected in `tasks` regardless
    setTimeout(() => setConflict(null), 6000);
  }, []);

  const { tasks, tasksList, setInitialTasks, moveTaskOptimistic, connectionStatus } =
    useBoardSocket(boardId, { onConflict: handleConflict });

  useEffect(() => {
    let cancelled = false;
    async function loadInitialTasks() {
      const res = await fetch(`/api/boards/${boardId}/tasks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (!cancelled) setInitialTasks(data);
    }
    loadInitialTasks();
    return () => {
      cancelled = true;
    };
  }, [boardId, setInitialTasks]);

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasksList
      .filter((t) => t.column === col.key)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Board</h1>
        <span
          className={
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
            (connectionStatus === "connected"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700")
          }
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (connectionStatus === "connected" ? "bg-emerald-500" : "bg-amber-500")
            }
          />
          {connectionStatus === "connected" ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {conflict && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A teammate updated a task you were also editing. The latest version is now
          shown — check "{conflict.incoming?.title || conflict.incoming?.taskId}" before
          you keep working on it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            label={col.label}
            columnKey={col.key}
            tasks={tasksByColumn[col.key]}
            onDropTask={(taskId, position) =>
              moveTaskOptimistic(taskId, col.key, position)
            }
          />
        ))}
      </div>
    </div>
  );
}
