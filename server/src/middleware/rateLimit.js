const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/*
 * Every limiter below counts in this process's memory — express-rate-limit's
 * default MemoryStore, deliberately kept rather than backed by Redis.
 *
 * Two consequences, and both are acceptable for a single always-on instance:
 *
 *   - The counts reset when the process does, so a deploy or a restart hands
 *     everyone a fresh allowance. On a host that sleeps when idle, waking up
 *     does the same.
 *   - They are per-instance. Run two copies of this server behind a load
 *     balancer and the effective limit doubles, because neither knows what the
 *     other has already counted.
 *
 * Both are listed in the README's known limitations. A shared store (Redis, via
 * rate-limit-redis) is the fix if this is ever scaled past one instance; it is
 * a dependency and a service to run, which is not worth it here.
 *
 * Every limiter is keyed on the client IP, which only reads correctly because
 * app.js sets `trust proxy` — behind Render's proxy the socket address is the
 * proxy's, not the caller's.
 */

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
