const { Router } = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');

const router = Router();

// Liveness probe — also the quickest way to confirm the client's Vite proxy is
// reaching this server at all.
router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: states[mongoose.connection.readyState] ?? 'unknown',
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);

module.exports = router;
