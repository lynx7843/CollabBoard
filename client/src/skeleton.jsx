import React from "react";
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

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    count: 1,
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
    count: 1,
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
    count: 1,
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

/*components*/

function TopBar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-2xl font-bold tracking-tight text-black">CollabBoard</h1>

      <div className="relative mx-8 hidden w-full max-w-xl md:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search boards, tasks..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-black placeholder-gray-400 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200"
        />
      </div>

      <button
        type="button"
        aria-label="Profile"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-500 transition hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
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
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
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

function TaskCard({ task }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-yellow-400">
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
          className="rounded p-1 text-gray-400 transition hover:bg-yellow-100 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
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
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-yellow-400 hover:bg-yellow-50 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
    >
      <Plus className="h-4 w-4" />
      Add Task
    </button>
  );
}

function Column({ column }) {
  return (
    <section className="flex w-full min-w-[280px] flex-col rounded-2xl border border-gray-200 bg-gray-50 p-4 md:w-[360px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-black">{column.title}</h2>
          <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-black">
            {column.count}
          </span>
        </div>
        <button
          type="button"
          aria-label={`${column.title} options`}
          className="rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        <AddTaskButton />
      </div>
    </section>
  );
}

/*pages*/

export default function CollabBoard() {
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
              className="flex items-center gap-2 rounded-lg bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            {COLUMNS.map((column) => (
              <Column key={column.id} column={column} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
