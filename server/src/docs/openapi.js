const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const env = require('../config/env');
const { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN } = require('../utils/patterns');

/*
 * The OpenAPI document.
 *
 * Only the shared parts live here — server list, the JWT scheme, and the
 * schemas that more than one route returns. Every path is documented by an
 * @openapi block above the route that serves it (src/routes/*.js), so a route
 * and its description are edited together and cannot drift apart.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'CollabBoard API',
    version: '1.0.0',
    description:
      'Boards, members and tasks for CollabBoard. Every endpoint except ' +
      '`/health`, `/auth/register` and `/auth/login` requires a bearer token: ' +
      'register or log in, then paste the returned `token` into **Authorize**.',
  },
  servers: [{ url: `http://localhost:${env.port}/api`, description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Liveness probe.' },
    { name: 'Auth', description: 'Registration and login.' },
    { name: 'Users', description: 'Account lookup for invites.' },
    { name: 'Boards', description: 'Boards the caller belongs to.' },
    { name: 'Members', description: 'Who can see a board.' },
    { name: 'Tasks', description: 'Cards on a board.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'The `token` returned by `/auth/register` or `/auth/login`.',
      },
    },
    parameters: {
      boardId: {
        name: 'boardId',
        in: 'path',
        required: true,
        description: "The board's slug, e.g. `q3-roadmap`.",
        schema: { type: 'string', pattern: '^[a-z0-9_-]+$' },
        example: 'q3-roadmap',
      },
      taskId: {
        name: 'taskId',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      },
      userId: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      },
    },
    schemas: {
      // Mirrors utils/publicUser.js — the only user shape that leaves the API.
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6650f0c2a1b2c3d4e5f60718' },
          name: { type: 'string', example: 'Dilan' },
          username: { type: 'string', example: 'dilan' },
          email: { type: 'string', format: 'email', example: 'dilan@example.com' },
          avatarColor: { type: 'string', example: '#4F46E5' },
          isAdmin: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Mirrors boardSummary() in controllers/boardController.js.
      Board: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          slug: { type: 'string', example: 'q3-roadmap' },
          name: { type: 'string', maxLength: 80, example: 'Q3 Roadmap' },
          description: { type: 'string', maxLength: 280 },
          owner: { type: 'string', description: 'User id of the owner.' },
          memberCount: { type: 'integer', example: 3 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          board: { type: 'string' },
          title: { type: 'string', maxLength: 140, example: 'Wire up the invite form' },
          description: { type: 'string', maxLength: 2000 },
          status: { type: 'string', enum: ['todo', 'doing', 'done'] },
          priority: {
            type: 'string',
            maxLength: 40,
            example: 'high',
            description:
              "The client writes 'high', 'medium' or 'low'. Stored as free text, " +
              'so tasks created before priorities existed keep their old label.',
          },
          position: { type: 'integer', description: 'Order within its column.' },
          version: {
            type: 'integer',
            description:
              'Incremented on every change that sticks. Quote it back as ' +
              '`expectedVersion` on a PATCH to have a lost update rejected ' +
              'with 409 rather than applied over someone else\'s.',
          },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthSuccess: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT bearer token.' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        description:
          'Send the handle as `username`; `name` is accepted as an alias for the ' +
          'form that posts it under that key, and `username` wins when both are sent.',
        properties: {
          username: { type: 'string', minLength: USERNAME_MIN, maxLength: USERNAME_MAX, example: 'dilan' },
          name: { type: 'string', maxLength: 60 },
          email: { type: 'string', format: 'email', maxLength: 254, example: 'dilan@example.com' },
          password: { type: 'string', format: 'password', minLength: PASSWORD_MIN, example: 'correct-horse' },
          confirmPassword: {
            type: 'string',
            format: 'password',
            description: 'Optional; checked against `password` when present.',
          },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        description:
          'Both fields are optional, but at least one must be sent. `name` is ' +
          'accepted as an alias for `username`, as on register.',
        properties: {
          username: { type: 'string', minLength: USERNAME_MIN, maxLength: USERNAME_MAX, example: 'dilan' },
          name: { type: 'string', maxLength: 60 },
          email: { type: 'string', format: 'email', maxLength: 254, example: 'dilan@example.com' },
        },
      },
      PasswordChangeRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password', minLength: PASSWORD_MIN },
          confirmPassword: {
            type: 'string',
            format: 'password',
            description: 'Optional; checked against `newPassword` when present.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['password'],
        description: 'The identifier may be either a username or an email address.',
        properties: {
          username: { type: 'string', example: 'dilan' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      // Every failure answers in this shape — see middleware/errorHandler.js.
      Error: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', description: 'Safe to render to the user as-is.' },
          details: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Per-field messages, when the failure names specific fields.',
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid or missing fields.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Missing, expired or invalid bearer token.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Authenticated, but not allowed to do this.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'No such resource, or one the caller may not see.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'Clashes with something that already exists.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded (disabled under NODE_ENV=test).',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  // Applied to every operation; the public ones opt out with `security: []`.
  security: [{ bearerAuth: [] }],
};

const spec = swaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
});

module.exports = { spec, definition };
