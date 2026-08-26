const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/*
 * Account creation is unauthenticated and writes to the database, so it is the
 * obvious target for scripted abuse. Cap it per IP.
 *
 * Disabled under NODE_ENV=test so the suite can fire many registrations without
 * tripping the limiter and turning real assertions into 429s.
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { message: 'Too many accounts created from this address. Try again later.' },
});

module.exports = { registerLimiter };
