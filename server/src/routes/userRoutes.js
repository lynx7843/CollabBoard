const { Router } = require('express');
const {
  lookupByEmail,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/userController');
const { requireAuth } = require('../middleware/requireAuth');
const { lookupLimiter, passwordChangeLimiter } = require('../middleware/rateLimit');

const router = Router();

/**
 * @openapi
 * /users/lookup:
 *   get:
 *     tags: [Users]
 *     summary: Resolve an email to an account
 *     description: >
 *       Backs the board invite field. Signed-in callers only: an open endpoint
 *       answering "does this address have an account?" is an enumeration oracle.
 *       Rate limited to 60 per IP per 15 minutes.
 *     parameters:
 *       - name: email
 *         in: query
 *         required: true
 *         schema: { type: string, format: email }
 *         example: dilan@example.com
 *     responses:
 *       200:
 *         description: The matching account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.get('/lookup', requireAuth, lookupLimiter, lookupByEmail);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: The signed-in account
 *     description: >
 *       Read fresh from the database, so the settings page shows what the server
 *       holds rather than the copy the client stored at login.
 *     responses:
 *       200:
 *         description: The signed-in account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   patch:
 *     tags: [Users]
 *     summary: Update your username or email
 *     description: >
 *       Either field may be omitted; an empty body is a 400. The username is
 *       held to the same rules as registration, so an edited account can still
 *       sign in. Taking the configured admin username is refused as a clash.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProfileUpdateRequest' }
 *     responses:
 *       200:
 *         description: The updated account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateProfile);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change your password
 *     description: >
 *       The current password is verified before the new one is stored. The
 *       caller's token stays valid — it carries only the user id — so the
 *       session survives the change. Rate limited to 10 per IP per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PasswordChangeRequest' }
 *     responses:
 *       200:
 *         description: Password updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Password updated. }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401:
 *         description: Not signed in, or the current password is wrong.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.patch('/me/password', requireAuth, passwordChangeLimiter, changePassword);

module.exports = router;
