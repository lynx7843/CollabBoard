const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { loadBoardForMember } = require('./boardController');
const { emitToBoard } = require('../socket');

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

/*
 * Optimistic concurrency, the client's half.
 *
 * A caller that wants to be told about a lost update quotes the version it read
 * the task at. Absent, the write is applied unconditionally — last writer wins,
 * which is what a move (status change) wants. Present but not a number is a
 * mistake worth failing loudly on: silently ignoring it would turn the check
 * off exactly when a client believed it was on.
 */
function readExpectedVersion(value) {
  if (value === undefined || value === null || value === '') return null;

  // Only a number or a numeric string. `Number(true)` is 1, and a boolean that
  // quietly became "version 1" would be the silent check this guard exists to
  // prevent.
  const numeric = typeof value === 'number' || typeof value === 'string';
  const expected = numeric ? Number(value) : NaN;

  if (!Number.isInteger(expected) || expected < 0) {
    throw ApiError.badRequest('expectedVersion must be a whole number.');
  }
  return expected;
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

  /*
   * The other people on this board are told after the write, never instead of
   * it: the response is what the caller acts on, and the broadcast is what
   * saves everyone else a refresh. The same payload goes to both, so a client
   * cannot end up with a different task than the one it would have fetched.
   *
   * The sender is in the room too and receives its own event back. That is
   * deliberate — boardReducer ignores a task it already holds, and it means a
   * write made in another tab of the same session still lands.
   */
  emitToBoard(board.slug, 'task:created', task.toJSON());

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

  const expectedVersion = readExpectedVersion(req.body.expectedVersion);
  // Tasks written before versioning existed have no version at all; they are
  // at 0, which is what a client reading them will have quoted.
  const currentVersion = task.version ?? 0;

  /*
   * Checked before anything is applied, so a rejected edit leaves the task
   * exactly as the other writer left it.
   *
   * The body carries `latest` alongside the message rather than putting it in
   * the usual `details` envelope: the client cannot resolve the conflict
   * without the server's version of the task in hand, and it is not an error
   * detail so much as the other half of the answer. useBoardPersistence reads
   * it from the top level.
   */
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    res.status(409).json({
      message: 'This task was changed by someone else while you were editing it.',
      latest: task.toJSON(),
    });
    return;
  }

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

  /*
   * A PATCH that changes nothing keeps the version where it is. Bumping it
   * would invalidate everyone else's expectedVersion for no reason, and there
   * is nothing for the board to redraw either.
   */
  if (task.isModified()) {
    task.version = currentVersion + 1;
    await task.save();
    emitToBoard(board.slug, 'task:updated', task.toJSON());
  }

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

  // Just the id: there is no task left to describe, and it is what the client's
  // TASK_DELETED reducer filters on.
  emitToBoard(board.slug, 'task:deleted', String(task._id));

  res.json({ deleted: String(task._id) });
}

module.exports = { listTasks, createTask, updateTask, deleteTask };
