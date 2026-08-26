const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimit');

const router = Router();

// Express 5 forwards a rejected promise from a handler to the error middleware
// on its own, so these controllers need no asyncHandler wrapper.
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

module.exports = router;
