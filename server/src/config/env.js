/*
 * Central, validated access to process.env.
 *
 * Nothing else in the codebase reads process.env directly. Anything required is
 * asserted here at boot so a missing secret fails loudly on startup instead of
 * quietly at the first request that needs it.
 */
const { buildOriginMatcher } = require('../utils/origins');

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

// Rebuilt only when CLIENT_ORIGIN itself changes, so the patterns are compiled
// once rather than on every request that carries an Origin header.
let originCache = { source: null, matcher: null };

function assertRequired() {
  const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy server/.env.example to server/.env and fill them in.',
    );
  }
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isTest() {
    return this.nodeEnv === 'test';
  },
  get port() {
    return toInt(process.env.PORT, 5000);
  },
  get mongoUri() {
    return process.env.MONGODB_URI;
  },
  get mongoDb() {
    return process.env.MONGODB_DB || 'collabboard';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d';
  },
  /*
   * The single account allowed to create and delete boards. Everyone else can
   * only work inside a board they have been invited to. Kept in the environment
   * rather than a role column so the group leader can change without a
   * migration; swap this for a proper role on User if the app grows more than
   * one privileged action.
   */
  get adminUsername() {
    return (process.env.ADMIN_USERNAME || 'dilan_amantha').trim().toLowerCase();
  },
  /*
   * Swagger UI at /api/docs. On by default so the documented API is always
   * browsable; set ENABLE_API_DOCS=false to keep it off a public deployment.
   */
  get docsEnabled() {
    return (process.env.ENABLE_API_DOCS || '').trim().toLowerCase() !== 'false';
  },
  get bcryptRounds() {
    return toInt(process.env.BCRYPT_ROUNDS, 12);
  },
  /*
   * Comma-separated so a deployed client origin can be added without a code
   * change. An entry may contain a `*` for one hostname label, which is how a
   * Vercel preview build — its subdomain is generated per deployment and cannot
   * be known in advance — gets in without widening the list to everything:
   *
   *   CLIENT_ORIGIN=https://collab-board-six-kappa.vercel.app,https://collab-board-*.vercel.app
   */
  get clientOrigins() {
    return (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  /*
   * The single answer to "may this browser talk to us", shared by the cors
   * middleware and Socket.IO so the REST and real-time sides cannot disagree.
   */
  get isAllowedOrigin() {
    const source = process.env.CLIENT_ORIGIN || '';
    if (originCache.source !== source) {
      originCache = { source, matcher: buildOriginMatcher(this.clientOrigins) };
    }
    return originCache.matcher;
  },
  assertRequired,
  describe,
};

/*
 * A one-line, secret-free summary of what the process actually booted with.
 * Only MONGODB_URI and JWT_SECRET are required, so everything else silently
 * falls back to a development default — printing the effective values makes a
 * key that was never set on the host obvious in the deploy log instead of
 * showing up later as an unexplained CORS failure or a missing admin.
 */
function describe() {
  const warnings = [];

  if (env.isProduction) {
    if (!process.env.CLIENT_ORIGIN) {
      warnings.push(
        'CLIENT_ORIGIN is not set, so only http://localhost:5173 may call this API. ' +
          'Set it to the deployed client URL (comma-separated for more than one).',
      );
    }
    if (!process.env.ADMIN_USERNAME) {
      warnings.push(`ADMIN_USERNAME is not set, falling back to "${env.adminUsername}".`);
    }
  }

  return {
    summary: [
      `env=${env.nodeEnv}`,
      `db=${env.mongoDb}`,
      `admin=${env.adminUsername}`,
      `origins=${env.clientOrigins.join(' ')}`,
      `docs=${env.docsEnabled ? 'on' : 'off'}`,
    ].join('  '),
    warnings,
  };
}

module.exports = env;
