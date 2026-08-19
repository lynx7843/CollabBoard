import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  LayoutGrid,
  Users,
  Settings,
  Plus,
  Pencil,
  MoreHorizontal,
  User,
  CheckCircle2,
} from "lucide-react";
import { socket } from "../socket"; //[cite: 3]

const INITIAL_COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    tasks: [
      {
        id: "t1",
        badge: "High Priority",
        badgeClass: "bg-yellow-100 text-yellow-900 border border-yellow-300",
        title: "test1",
        description: "test1",
        done: false,
      },
    ],
  },
  {
    id: "doing",
    title: "Doing",
    tasks: [
      {
        id: "t2",
        badge: "In Progress",
        badgeClass: "bg-black text-yellow-300",
        title: "test2",
        description: "test2",
        done: false,
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      {
        id: "t3",
        badge: "Completed",
        badgeClass: "bg-white text-gray-600 border border-gray-300",
        badgeIcon: true,
        title: "test3",
        description: "test3",
        done: true,
        date: "Oct 12",
      },
    ],
  },
];

const NAV_ITEMS = [
  { id: "boards", label: "Boards", icon: LayoutGrid, active: true },
  { id: "members", label: "Members", icon: Users, active: false },
  { id: "settings", label: "Settings", icon: Settings, active: false },
];

function TopBar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-2xl font-bold tracking-tight text-black">CollabBoard</h1>
      <div className="relative mx-8 hidden w-full max-w-xl md:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search boards, tasks..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
        />
      </div>
      <button
        type="button"
        aria-label="Profile"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-500 transition hover:bg-gray-200"
      >
        <User className="h-5 w-5" />
      </button>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white p-5 md:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-400 text-sm font-bold text-black">
          G13
        </div>
        <div>
          <p className="font-bold text-black">Group 13</p>
          <p className="text-sm text-gray-500">Marketing Project</p>
        </div>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon, active }) => (
          <button
            key={id}
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
              active
                ? "bg-yellow-100 font-semibold text-black"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* Draggable Task Component */
function TaskCard({ task, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-yellow-400 cursor-grab active:cursor-grabbing ${
        isOverlay ? "shadow-2xl ring-2 ring-yellow-400 scale-105" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${task.badgeClass}`}
        >
          {task.badgeIcon && <CheckCircle2 className="h-3.5 w-3.5" />}
          {task.badge}
        </span>
        <button
          type="button"
          aria-label={`Edit ${task.title}`}
          className="rounded p-1 text-gray-400 transition hover:bg-yellow-100 hover:text-black"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <h3
        className={`mb-1.5 text-lg font-bold ${
          task.done ? "text-gray-400 line-through" : "text-black"
        }`}
      >
        {task.title}
      </h3>

      <p className={`text-sm ${task.done ? "text-gray-400" : "text-gray-600"}`}>
        {task.description}
      </p>

      {task.date && <p className="mt-3 text-sm text-gray-400">{task.date}</p>}
    </article>
  );
}

function AddTaskButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-yellow-400 hover:bg-yellow-50 hover:text-black"
    >
      <Plus className="h-4 w-4" />
      Add Task
    </button>
  );
}

/* Droppable Column Component */
function Column({ column }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  const taskIds = column.tasks.map((task) => task.id);

  return (
    <section
      ref={setNodeRef}
      className="flex w-full min-w-[280px] flex-col rounded-2xl border border-gray-200 bg-gray-50 p-4 md:w-[360px]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-black">{column.title}</h2>
          <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-black">
            {column.tasks.length}
          </span>
        </div>
        <button
          type="button"
          aria-label={`${column.title} options`}
          className="rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-black"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[150px] flex-col gap-3">
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          <AddTaskButton />
        </div>
      </SortableContext>
    </section>
  );
}

export default function CollabBoard() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [activeTask, setActiveTask] = useState(null);

  // Require dragging 5px before activating drag state to permit standard clicks on buttons
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Utility to locate task and container
  const findTaskAndColumn = (taskId) => {
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) return { task, column: col };
    }
    return { task: null, column: null };
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const { task } = findTaskAndColumn(active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const { column: sourceCol } = findTaskAndColumn(activeId);
    let targetCol = columns.find((col) => col.id === overId);

    if (!targetCol) {
      const { column } = findTaskAndColumn(overId);
      targetCol = column;
    }

    if (!sourceCol || !targetCol || sourceCol.id === targetCol.id) return;

    // Optimistically update React State during drag-over across columns
    setColumns((prev) => {
      const activeTaskItem = sourceCol.tasks.find((t) => t.id === activeId);
      
      return prev.map((col) => {
        if (col.id === sourceCol.id) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== activeId),
          };
        }
        if (col.id === targetCol.id) {
          return {
            ...col,
            tasks: [...col.tasks, activeTaskItem],
          };
        }
        return col;
      });
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const { column: sourceCol } = findTaskAndColumn(activeId);
    if (!sourceCol) return;

    const activeIndex = sourceCol.tasks.findIndex((t) => t.id === activeId);
    const overIndex = sourceCol.tasks.findIndex((t) => t.id === overId);

    let updatedColumns = [...columns];

    // Reorder within the same column
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      const reorderedTasks = arrayMove(sourceCol.tasks, activeIndex, overIndex);
      updatedColumns = columns.map((col) =>
        col.id === sourceCol.id ? { ...col, tasks: reorderedTasks } : col
      );
      setColumns(updatedColumns);
    }

    // Server Synchronization Logic
    try {
      const targetTask = sourceCol.tasks.find((t) => t.id === activeId);
      const newPosition = sourceCol.tasks.findIndex((t) => t.id === activeId);

      const payload = {
        taskId: activeId,
        columnId: sourceCol.id,
        position: newPosition,
      };

      // Emit via socket or API call
      if (socket.connected) {
        socket.emit("task:move", payload); //[cite: 3]
      } else {
        await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/tasks/move`, { //[cite: 3]
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`, //[cite: 1]
          },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.error("Failed to synchronize task position:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <TopBar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 overflow-x-auto p-6 md:p-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-black">Q3 Roadmap</h2>
              <p className="mt-1 text-gray-500">Manage all upcoming features and fixes.</p>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              {columns.map((column) => (
                <Column key={column.id} column={column} />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}