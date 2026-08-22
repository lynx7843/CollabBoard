import { useState } from "react";
import TaskCard from "./TaskCard";

export default function Column({ label, columnKey, tasks, onDropTask }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("text/task-id");
    const nextPosition = tasks.length; // append to end of this column
    if (taskId) onDropTask(taskId, nextPosition);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={
        "flex min-h-[220px] flex-col gap-2 rounded-lg border p-3 transition-colors " +
        (isDragOver ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white")
      }
      data-column={columnKey}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-slate-600">{label}</h2>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-200 px-2 py-6 text-center text-xs text-slate-400">
            Nothing here yet
          </p>
        )}
      </div>
    </div>
  );
}
