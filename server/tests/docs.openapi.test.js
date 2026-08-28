const request = require('supertest');
/*
 * The spec is only worth publishing if it still describes the routes that exist.
 * These tests fail when an endpoint is added without an @openapi block above it,
 * which is the drift that makes generated docs untrustworthy.
 */

const routes = require('../src/routes');
const { createApp } = require('../src/app');
const { spec } = require('../src/docs/openapi');

const documented = Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
  Object.keys(item).map((method) => `${method} ${path}`),
);

// The prefixes a sub-router could be mounted under, taken from the spec.
const mountCandidates = [
  ...new Set(Object.keys(spec.paths ?? {}).map((path) => `/${path.split('/')[1]}`)),
];

/*
 * Every real endpoint as "get /boards/{boardId}/tasks" — the shape the spec
 * keys its paths by.
 *
 * Express 5 keeps no mount path on a layer, but a layer's matcher reports the
 * prefix it consumes, so each candidate above is offered to it until one
 * matches. A router mounted somewhere the spec knows nothing about therefore
 * resolves to UNMOUNTED and fails the coverage test below by name, which is
 * exactly the case of a new router added without docs.
 */
const UNMOUNTED = '/<undocumented mount>';

function registeredEndpoints(router, prefix = '') {
  const found = [];

  for (const layer of router.stack) {
    if (layer.route) {
      const path = toOpenApiPath(prefix + layer.route.path);
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled && method !== '_all') found.push(`${method} ${path}`);
      }
    } else if (layer.handle?.stack && layer.handle !== router) {
      found.push(...registeredEndpoints(layer.handle, prefix + mountPath(layer)));
    }
  }

  return found;
}

function mountPath(layer) {
  for (const candidate of mountCandidates) {
    for (const matcher of layer.matchers ?? []) {
      const matched = matcher(candidate);
      if (matched && matched.path === candidate) return candidate;
    }
  }
  return UNMOUNTED;
}

// :boardId -> {boardId}
function toOpenApiPath(path) {
  const normalised = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return normalised.length > 1 ? normalised.replace(/\/$/, '') : normalised;
}

describe('OpenAPI spec', () => {
  it('is a 3.x document with the bearer scheme declared', () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('documents every registered route', () => {
    const missing = registeredEndpoints(routes).filter((route) => !documented.includes(route));
    expect(missing).toEqual([]);
  });

  it('documents no route that does not exist', () => {
    const registered = registeredEndpoints(routes);
    const stale = documented.filter((route) => !registered.includes(route));
    expect(stale).toEqual([]);
  });

  it('resolves every $ref it uses', () => {
    const refs = new Set();
    JSON.stringify(spec, (key, value) => {
      if (key === '$ref') refs.add(value);
      return value;
    });

    for (const ref of refs) {
      const target = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce((node, segment) => node?.[segment], spec);
      expect(target).toBeDefined();
    }
  });

  it('requires a token on everything except health, register and login', () => {
    const publicRoutes = ['get /health', 'post /auth/register', 'post /auth/login'];

    for (const [path, item] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        const isPublic = publicRoutes.includes(`${method} ${path}`);
        // An operation inherits the document-level bearerAuth unless it opts out.
        expect(operation.security).toEqual(isPublic ? [] : undefined);
      }
    }
  });
});

describe('GET /api/docs', () => {
  it('serves the Swagger UI page', async () => {
    const res = await request(createApp()).get('/api/docs/').expect(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('serves the raw spec as JSON', async () => {
    const res = await request(createApp()).get('/api/docs.json').expect(200);
    expect(res.body.info.title).toBe('CollabBoard API');
  });
});
