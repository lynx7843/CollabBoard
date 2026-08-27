const { Router } = require('express');
const { listMembers, addMember, removeMember } = require('../controllers/boardController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();

// Nothing about a board is public.
router.use(requireAuth);

router.get('/:boardId/members', listMembers);
router.post('/:boardId/members', addMember);
router.delete('/:boardId/members/:userId', removeMember);

module.exports = router;
