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

/*
 * The invite lookup answers "does this email have an account?". It is behind
 * requireAuth, but one signed-in user should still not be able to walk a list of
 * addresses through it, so cap the attempts per IP.
 */
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { message: 'Too many lookups. Try again in a few minutes.' },
});

/*
 * Changing a password requires the current one, which makes the endpoint a
 * password-guessing oracle for anyone holding a stolen token. Capped per IP,
 * and successes are not counted so a user correcting a typo is not locked out.
 */
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.isTest,
  message: { message: 'Too many password attempts. Try again in a few minutes.' },
});

module.exports = { registerLimiter, loginLimiter, lookupLimiter, passwordChangeLimiter };
