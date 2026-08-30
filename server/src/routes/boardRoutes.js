const { Router } = require('express');
const {
  listBoards,
  searchBoards,
  createBoard,
  deleteBoard,
  listMembers,
  addMember,
  removeMember,
} = require('../controllers/boardController');
const { listTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

// Nothing about a board is public.
router.use(requireAuth);

/**
 * @openapi
 * /boards:
 *   get:
 *     tags: [Boards]
 *     summary: List the boards the caller belongs to
 *     description: Oldest first, so the client's tab strip keeps a stable order.
 *     responses:
 *       200:
 *         description: The caller's boards, plus what they may do next.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 boards:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Board' }
 *                 maxBoards: { type: integer, example: 5 }
 *                 canCreate:
 *                   type: boolean
 *                   description: Admin, and below the cap. The server re-checks on write.
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', listBoards);

/**
 * @openapi
 * /boards/search:
 *   get:
 *     tags: [Boards]
 *     summary: Find the board to open for a search term
 *     description: >
 *       Backs the top search bar, which only ever opens a board, so this answers
 *       with the one board to open rather than a list of hits. Matches a board
 *       name first, then a task title on any board the caller is a member of;
 *       ties are broken by the oldest board, the same order the tab strip uses.
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         example: roadmap
 *     responses:
 *       200:
 *         description: The board to open, and what matched.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board: { $ref: '#/components/schemas/Board' }
 *                 match:
 *                   type: object
 *                   properties:
 *                     type: { type: string, enum: [board, task] }
 *                     title:
 *                       type: string
 *                       description: The board or task name that matched.
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Nothing matched.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// Before '/:boardId', or 'search' would be read as a board id.
router.get('/search', searchBoards);

/**
 * @openapi
 * /boards:
 *   post:
 *     tags: [Boards]
 *     summary: Create a board
 *     description: Admin only. The slug is derived from the name and returned in the response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 80, example: 'Q3 Roadmap' }
 *               description: { type: string, maxLength: 280 }
 *     responses:
 *       201:
 *         description: Board created, with the caller as owner and sole member.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board: { $ref: '#/components/schemas/Board' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: The per-owner board cap is reached.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', createBoard);

/**
 * @openapi
 * /boards/{boardId}:
 *   delete:
 *     tags: [Boards]
 *     summary: Delete a board and its tasks
 *     description: >
 *       Admin, and only for a board they own. Member accounts are untouched.
 *       A board the caller is not a member of answers 404 rather than 403.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *     responses:
 *       200:
 *         description: Deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted: { type: string, description: 'Slug of the deleted board.' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:boardId', deleteBoard);

/**
 * @openapi
 * /boards/{boardId}/members:
 *   get:
 *     tags: [Members]
 *     summary: List a board's members
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *     responses:
 *       200:
 *         description: Everyone who can open this board, the owner included.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:boardId/members', listMembers);

/**
 * @openapi
 * /boards/{boardId}/members:
 *   post:
 *     tags: [Members]
 *     summary: Invite a registered user by email
 *     description: Any member of the board may invite; the invitee must already have an account.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       201:
 *         description: The user now on the board.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: No such board, or no account with that email.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Already a member of this board.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:boardId/members', addMember);

/**
 * @openapi
 * /boards/{boardId}/members/{userId}:
 *   delete:
 *     tags: [Members]
 *     summary: Remove a member from a board
 *     description: >
 *       Drops the membership only — the account keeps its login and can be
 *       invited back. The owner cannot be removed.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *       - $ref: '#/components/parameters/userId'
 *     responses:
 *       200:
 *         description: Removed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 removed: { type: string, description: 'Id of the removed user.' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:boardId/members/:userId', removeMember);

/**
 * @openapi
 * /boards/{boardId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List a board's tasks, grouped by column
 *     description: >
 *       Each column is ordered by `position`, then `createdAt`. A new board
 *       comes back with three empty arrays.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *     responses:
 *       200:
 *         description: The board's cards.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 columns:
 *                   type: object
 *                   properties:
 *                     todo:  { type: array, items: { $ref: '#/components/schemas/Task' } }
 *                     doing: { type: array, items: { $ref: '#/components/schemas/Task' } }
 *                     done:  { type: array, items: { $ref: '#/components/schemas/Task' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:boardId/tasks', listTasks);

/**
 * @openapi
 * /boards/{boardId}/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task
 *     description: The card is appended to the end of its column.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, maxLength: 140 }
 *               description: { type: string, maxLength: 2000 }
 *               status: { type: string, enum: [todo, doing, done], default: todo }
 *               priority:
 *                 type: string
 *                 maxLength: 40
 *                 description: "'high', 'medium' or 'low'."
 *                 example: medium
 *     responses:
 *       201:
 *         description: Task created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task: { $ref: '#/components/schemas/Task' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/:boardId/tasks', createTask);

/**
 * @openapi
 * /boards/{boardId}/tasks/{taskId}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update a task
 *     description: >
 *       Every field is optional; only those present are changed. Changing
 *       `status` is how a card moves column, and re-positions it at the end of
 *       the column it lands in.
 *
 *
 *       Send `expectedVersion` to have a lost update rejected instead of
 *       applied: if the task has moved on since it was read, the answer is 409
 *       carrying the server's copy, and nothing is written. Omit it for a
 *       last-writer-wins update. A write that changes something increments the
 *       task's `version`.
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *       - $ref: '#/components/parameters/taskId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title: { type: string, maxLength: 140 }
 *               description: { type: string, maxLength: 2000 }
 *               status: { type: string, enum: [todo, doing, done] }
 *               priority:
 *                 type: string
 *                 maxLength: 40
 *                 description: "'high', 'medium' or 'low'."
 *                 example: high
 *               expectedVersion:
 *                 type: integer
 *                 minimum: 0
 *                 description: The task's `version` as the caller last read it.
 *                 example: 3
 *     responses:
 *       200:
 *         description: The updated task.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task: { $ref: '#/components/schemas/Task' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: >
 *           The task changed since `expectedVersion` was read. Nothing was
 *           written; `latest` is the server's copy, for the client to show
 *           beside the rejected edit.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 latest: { $ref: '#/components/schemas/Task' }
 */
router.patch('/:boardId/tasks/:taskId', updateTask);

/**
 * @openapi
 * /boards/{boardId}/tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     parameters:
 *       - $ref: '#/components/parameters/boardId'
 *       - $ref: '#/components/parameters/taskId'
 *     responses:
 *       200:
 *         description: Deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted: { type: string, description: 'Id of the deleted task.' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:boardId/tasks/:taskId', deleteTask);

module.exports = router;
