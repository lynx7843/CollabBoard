const { Router } = require('express');
const { lookupByEmail } = require('../controllers/userController');
const { requireAuth } = require('../middleware/requireAuth');
const { lookupLimiter } = require('../middleware/rateLimit');

const router = Router();

router.get('/lookup', requireAuth, lookupLimiter, lookupByEmail);

module.exports = router;
