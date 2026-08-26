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

/*
 * Login is the brute-force target: unlike registration, an attacker gets a
 * useful signal from each attempt. Keyed per IP and tighter than register.
 *
 * Successful logins do not count against the limit, so a user with a working
 * password is never locked out by someone else guessing from the same NAT.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.isTest,
  message: { message: 'Too many login attempts. Try again in a few minutes.' },
});

module.exports = { registerLimiter, loginLimiter };
