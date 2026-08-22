export default function TaskCard({ task }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/task-id", task._id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-slate-800">{task.title}</p>
      {task.assignee && (
        <p className="mt-1 text-xs text-slate-400">{task.assignee}</p>
      )}
    </div>
  );
}
