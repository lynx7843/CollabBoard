const { Router } = require('express');
const {
  listBoards,
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

router.get('/', listBoards);
router.post('/', createBoard);
router.delete('/:boardId', deleteBoard);

router.get('/:boardId/members', listMembers);
router.post('/:boardId/members', addMember);
router.delete('/:boardId/members/:userId', removeMember);

router.get('/:boardId/tasks', listTasks);
router.post('/:boardId/tasks', createTask);
router.patch('/:boardId/tasks/:taskId', updateTask);
router.delete('/:boardId/tasks/:taskId', deleteTask);

module.exports = router;
