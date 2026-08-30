/*
 * The one place a request to the API is built.
 *
 * Every endpoint needs the bearer token, and every failure answers with JSON
 * carrying a `message` written to be shown to the user (see the server's
 * errorHandler), so both are handled here rather than in each caller.
 */
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...authHeaders(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    // The whole body, not just the message: a 409 from a task edit carries the
    // server's copy of the task as `latest`, which the caller needs to show or
    // apply. Everything else can ignore it.
    error.data = data;
    throw error;
  }

  return data;
}
