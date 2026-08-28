const { Router } = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const boardRoutes = require('./boardRoutes');

const router = Router();

// Liveness probe — also the quickest way to confirm the client's Vite proxy is
// reaching this server at all.
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Also the quickest way to confirm the client's Vite proxy reaches this server.
 *     security: []
 *     responses:
 *       200:
 *         description: The server is up.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 db:
 *                   type: string
 *                   enum: [disconnected, connected, connecting, disconnecting, unknown]
 *                 uptime: { type: number, description: 'Process uptime in seconds.' }
 */
router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: states[mongoose.connection.readyState] ?? 'unknown',
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/boards', boardRoutes);

module.exports = router;
