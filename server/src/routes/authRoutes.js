const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimit');

const router = Router();

// Express 5 forwards a rejected promise from a handler to the error middleware
// on its own, so these controllers need no asyncHandler wrapper.

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account
 *     description: >
 *       Creates the account and signs the caller straight in — the response
 *       carries the same `{ token, user }` pair as login.
 *       Rate limited to 10 per IP per 15 minutes.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: Account created.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409:
 *         description: That username or email is already taken.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/register', registerLimiter, register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in
 *     description: >
 *       Accepts a username or an email as the identifier. Wrong credentials and
 *       an unknown account answer identically, so neither confirms which
 *       usernames exist. Rate limited to 20 failed attempts per IP per 15 minutes.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Signed in.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSuccess' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401:
 *         description: Invalid username or password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post('/login', loginLimiter, login);

module.exports = router;
