const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { loadBoardForMember } = require('./boardController');

const { STATUSES } = Task;

/*
 * Tasks are addressed through their board, so every handler here starts by
 * proving the caller is a member of it. A task id from another board therefore
 * cannot be reached by guessing.
 */
async function loadTask(req, board) {
  const task = await Task.findOne({ _id: castId(req.params.taskId), board: board._id });
  if (!task) throw ApiError.notFound('Task not found.');
  return task;
}

// An id that is not a valid ObjectId would make the query throw a cast error
// and surface as a 500; it is simply "no such task".
function castId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value)) ? value : null;
}

function readStatus(value, fallback) {
  const status = String(value ?? fallback ?? 'todo').trim().toLowerCase();
  if (!STATUSES.includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${STATUSES.join(', ')}.`);
  }
  return status;
}

/*
 * GET /api/boards/:boardId/tasks
 * 200  { columns: { todo: [...], doing: [...], done: [...] } }
 *
 * Grouped by column so BoardView can render the response as-is — a new board
 * comes back with three empty arrays.
 */
async function listTasks(req, res) {
  const board = await loadBoardForMember(req);
  const tasks = await Task.find({ board: board._id }).sort({ position: 1, createdAt: 1 });

  const columns = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const task of tasks) columns[task.status].push(task.toJSON());

  res.json({ columns });
}

/*
 * POST /api/boards/:boardId/tasks   Body { title, description?, status?, priority? }
 * 201  { task }
 */
async function createTask(req, res) {
  const board = await loadBoardForMember(req);

  const title = String(req.body.title || '').trim();
  if (!title) throw ApiError.badRequest('Give the task a title.');

  const status = readStatus(req.body.status);

  // Appended to the end of its column. countDocuments is enough here: a lost
  // race only means two cards share a position, and the createdAt tiebreak in
  // listTasks still gives a stable order.
  const position = await Task.countDocuments({ board: board._id, status });

  const task = await Task.create({
    board: board._id,
    title,
    description: String(req.body.description || '').trim(),
    status,
    priority: String(req.body.priority || '').trim(),
    position,
    createdBy: req.user._id,
  });

  res.status(201).json({ task: task.toJSON() });
}

/*
 * PATCH /api/boards/:boardId/tasks/:taskId
 * Body may carry any of { title, description, status, priority }.
 * 200  { task }
 *
 * A status change is how a card moves between columns, so it is re-positioned
 * at the end of the column it lands in.
 */
async function updateTask(req, res) {
  const board = await loadBoardForMember(req);
  const task = await loadTask(req, board);

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) throw ApiError.badRequest('Give the task a title.');
    task.title = title;
  }

  if (req.body.description !== undefined) {
    task.description = String(req.body.description).trim();
  }

  if (req.body.priority !== undefined) {
    task.priority = String(req.body.priority).trim();
  }

  if (req.body.status !== undefined) {
    const status = readStatus(req.body.status, task.status);
    if (status !== task.status) {
      task.position = await Task.countDocuments({ board: board._id, status });
      task.status = status;
    }
  }

  await task.save();

  res.json({ task: task.toJSON() });
}

/*
 * DELETE /api/boards/:boardId/tasks/:taskId
 * 200  { deleted }
 */
async function deleteTask(req, res) {
  const board = await loadBoardForMember(req);
  const task = await loadTask(req, board);

  await Task.deleteOne({ _id: task._id });

  res.json({ deleted: String(task._id) });
}

module.exports = { listTasks, createTask, updateTask, deleteTask };
