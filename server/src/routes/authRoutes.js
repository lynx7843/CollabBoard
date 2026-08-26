const { Router } = require('express');
const { register } = require('../controllers/authController');
const { registerLimiter } = require('../middleware/rateLimit');

const router = Router();

// Express 5 forwards a rejected promise from a handler to the error middleware
// on its own, so these controllers need no asyncHandler wrapper.
router.post('/register', registerLimiter, register);

module.exports = router;
