const { Router } = require('express');
const { lookupByEmail } = require('../controllers/userController');
const { requireAuth } = require('../middleware/requireAuth');
const { lookupLimiter } = require('../middleware/rateLimit');

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

module.exports = router;
