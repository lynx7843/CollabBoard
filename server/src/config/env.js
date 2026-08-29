/*
 * Central, validated access to process.env.
 *
 * Nothing else in the codebase reads process.env directly. Anything required is
 * asserted here at boot so a missing secret fails loudly on startup instead of
 * quietly at the first request that needs it.
 */
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

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
  // Comma-separated so a deployed client origin can be added without a code change.
  get clientOrigins() {
    return (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  assertRequired,
};

module.exports = env;
