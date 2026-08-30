const http = require('http');
const request = require('supertest');

const { createApp } = require('../src/app');
const { initSocket, closeSocket } = require('../src/socket');
const env = require('../src/config/env');

/*
 * Who the browser is allowed to be.
 *
 * Deployment makes this awkward: the production client is one fixed Vercel URL,
 * but every preview build gets a generated subdomain that cannot be listed in
 * advance. CLIENT_ORIGIN therefore accepts a wildcard, and these tests pin down
 * both that it lets the previews in and that it does not let everything in.
 *
 * The socket handshake is checked as well as the REST API, because that is the
 * only part of the deployed client that is genuinely cross-origin — the REST
 * calls arrive same-origin through the Vercel rewrite.
 */
const PRODUCTION = 'https://collab-board-six-kappa.vercel.app';
const PREVIEW = 'https://collab-board-git-dilan-bugfixes-lynx.vercel.app';

let app;
let server;
const original = process.env.CLIENT_ORIGIN;

beforeAll(async () => {
  app = createApp();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
});

afterAll(async () => {
  await closeSocket();
  await new Promise((resolve) => server.close(resolve));
  process.env.CLIENT_ORIGIN = original;
});

// The allowlist is read per request, so a case can set it and the next case is
// unaffected.
const allow = (...origins) => {
  process.env.CLIENT_ORIGIN = origins.join(',');
};

// What the browser actually looks for: the echoed Access-Control-Allow-Origin.
// Absent means the browser blocks the response, whatever its status code.
const allowedOriginFor = async (origin) => {
  const res = await request(app).get('/api/health').set('Origin', origin);
  return res.headers['access-control-allow-origin'];
};

const handshakeAllowedOriginFor = async (origin) => {
  const res = await request(server)
    .get('/socket.io/?EIO=4&transport=polling')
    .set('Origin', origin);
  return res.headers['access-control-allow-origin'];
};

describe('CORS allowlist', () => {
  afterEach(() => {
    process.env.CLIENT_ORIGIN = original;
  });

  describe('an exact origin', () => {
    it('is allowed', async () => {
      allow(PRODUCTION);
      expect(await allowedOriginFor(PRODUCTION)).toBe(PRODUCTION);
    });

    it('is allowed even if it was configured with a trailing slash', async () => {
      allow(`${PRODUCTION}/`);
      expect(await allowedOriginFor(PRODUCTION)).toBe(PRODUCTION);
    });

    it('does not carry its neighbours in', async () => {
      allow(PRODUCTION);
      expect(await allowedOriginFor('https://someone-elses-app.vercel.app')).toBeUndefined();
      expect(await allowedOriginFor(PREVIEW)).toBeUndefined();
    });
  });

  describe('a wildcard for preview deployments', () => {
    it('lets a generated preview subdomain in', async () => {
      allow(PRODUCTION, 'https://collab-board-*.vercel.app');
      expect(await allowedOriginFor(PREVIEW)).toBe(PREVIEW);
    });

    it('still refuses another project on the same host', async () => {
      allow('https://collab-board-*.vercel.app');
      expect(await allowedOriginFor('https://unrelated-project.vercel.app')).toBeUndefined();
    });

    it('does not stretch across a dot', async () => {
      allow('https://collab-board-*.vercel.app');
      // A subdomain of somebody else's domain, ending in the allowed suffix.
      expect(await allowedOriginFor('https://collab-board-x.attacker.vercel.app')).toBeUndefined();
    });

    it('does not match an origin that merely starts with an allowed one', async () => {
      allow(PRODUCTION, 'https://collab-board-*.vercel.app');
      expect(await allowedOriginFor(`${PRODUCTION}.attacker.example`)).toBeUndefined();
    });
  });

  describe('the default', () => {
    it('is the Vite dev server, so local development needs no configuration', async () => {
      delete process.env.CLIENT_ORIGIN;
      expect(env.clientOrigins).toEqual(['http://localhost:5173']);
      expect(await allowedOriginFor('http://localhost:5173')).toBe('http://localhost:5173');
      expect(await allowedOriginFor(PRODUCTION)).toBeUndefined();
    });
  });

  describe('the Socket.IO handshake', () => {
    it('uses the same allowlist as the REST API', async () => {
      allow(PRODUCTION, 'https://collab-board-*.vercel.app');
      expect(await handshakeAllowedOriginFor(PRODUCTION)).toBe(PRODUCTION);
      expect(await handshakeAllowedOriginFor(PREVIEW)).toBe(PREVIEW);
    });

    it('refuses an origin the REST API would refuse', async () => {
      allow(PRODUCTION);
      expect(await handshakeAllowedOriginFor('https://evil.example')).toBeUndefined();
    });
  });
});
