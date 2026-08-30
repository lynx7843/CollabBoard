/*
 * Which browser origins may talk to this API.
 *
 * A plain list is not quite enough in deployment: every Vercel preview build
 * gets its own generated subdomain, so the branch being demoed is never the
 * origin that was allowlisted. An entry may therefore contain a `*` standing in
 * for one label of the hostname:
 *
 *   https://collab-board-six-kappa.vercel.app    exact, the production URL
 *   https://collab-board-*.vercel.app            that project's preview builds
 *
 * The wildcard deliberately does not cross a dot, so it cannot be stretched
 * across a domain boundary. Keep the pattern as narrow as the deployment
 * allows — this is an allowlist, and a `*` matching every project on a shared
 * host is barely one.
 */

// "https://Example.com/" and "https://example.com" are the same origin; a
// pasted trailing slash is the usual way an allowlist silently fails.
function normalize(origin) {
  return String(origin || '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');
}

function toMatcher(pattern) {
  const normalized = normalize(pattern);

  if (!normalized.includes('*')) {
    return (origin) => origin === normalized;
  }

  const source = normalized
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    // One hostname label: letters, digits and dashes, never a dot.
    .join('[a-z0-9-]+');

  const regex = new RegExp(`^${source}$`);
  return (origin) => regex.test(origin);
}

/*
 * Returns a predicate over the Origin header. Both the cors middleware and
 * Socket.IO take one, so the REST and real-time sides cannot drift into
 * disagreeing about who is allowed in.
 */
function buildOriginMatcher(patterns) {
  const matchers = (patterns || []).map(toMatcher);

  return function isAllowedOrigin(origin) {
    // No Origin header at all: curl, a health check, a server-to-server call.
    // There is no browser to protect and no header to answer with.
    if (!origin) return true;

    return matchers.some((matches) => matches(normalize(origin)));
  };
}

module.exports = { buildOriginMatcher, normalize };
