# CollabBoard

[![CI](https://github.com/lynx7843/CollabBoard/actions/workflows/ci.yml/badge.svg)](https://github.com/lynx7843/CollabBoard/actions/workflows/ci.yml)

A collaborative Kanban board for small teams. Several people work the same board
at once: task changes appear for everyone without a refresh, a clashing edit is
refused instead of silently overwriting someone's work, and changes made while
the network is down are kept on the device and replayed when it returns.

| | |
| --- | --- |
| **App** | https://collab-board-six-kappa.vercel.app |
| **API** | https://syncspace-api-rxhi.onrender.com |
| **API docs** | https://syncspace-api-rxhi.onrender.com/api/docs |

> The API runs on a free tier that sleeps when idle, so the first request after a
> quiet spell takes ~30 seconds to wake it. Open the app once before demoing.

---

## What it does

**Boards and tasks.** Three columns — To Do, Doing, Done — with live task counts.
Tasks are created inline in any column, edited in place, moved between columns
and deleted. Each carries a title, description and priority.

**Multiple boards.** Each board is addressable at `/boards/:slug` behind a
browser-style tab strip, so a reload or a shared link reopens the same board.
Only the group leader (the account `ADMIN_USERNAME` names) can create or delete
boards, capped at five — enforced on the server, merely reflected in the UI.

**Membership.** Invite a registered user by email, remove a member, and see who
is on the board. The owner is always retained. A non-member asking for a board
gets `404`, not `403`, so the API never confirms that a board they cannot see
exists.

**Accounts.** Register, sign in, and change username, email or password from a
settings page. The session survives a password change because the token carries
only the user id.

**Search.** One box searches every board the caller belongs to, by board name and
task title. A board-name match wins over a task-title match; the oldest board
breaks a tie.

**Real-time, conflict detection and offline support** each have a section below —
they are the parts with real mechanics behind them.

### Where the brief's requirements live

| Requirement | How it is met | Where |
| --- | --- | --- |
| Authentication | JWT, bcrypt at 12 rounds, protected routes | [Security](#security) |
| Real-time updates | Socket.IO room per board, broadcast on every task write | [Real-time updates](#real-time-updates) |
| Concurrent-edit detection | Per-task `version`, `409` with the server's copy, resolution dialog | [Concurrent edits](#concurrent-edits) |
| Work survives a refresh or brief network loss | Board cached on the device, changes queued and replayed | [Offline support](#offline-support) |
| Automated tests | 125 server tests, 37 client tests | [Tests](#tests) |
| CI | GitHub Actions, both halves on every PR | [Continuous integration](#continuous-integration) |
| Local multi-service run | `docker compose up` — Mongo, API and client | [Running with Docker](#running-with-docker) |
| Public URL | Vercel + Render + Atlas | [Deployment](#deployment) |

---

## Architecture

Two deployables, because Socket.IO needs a process that stays alive and holds
open connections, which serverless functions do not.

Every REST call in the client is a **relative** `/api/...` path — there is no API
base URL in the bundle. Three different things resolve it: the Vite dev proxy
locally, an nginx `proxy_pass` under Docker, and a rewrite in `client/vercel.json`
in production. The last of those also makes the API same-origin, so there is no
CORS preflight on ordinary requests.

The WebSocket is the exception. A rewrite cannot carry an upgrade, so the socket
connects straight to the API host at `VITE_API_URL` and that origin must be in
the API's `CLIENT_ORIGIN` allowlist.

**Server layout:** routes → controllers → models, with middleware, validators and
utils beside them. Validation rules are shared between the Mongoose schema and
the request validators (`utils/patterns.js`), so the database and the API cannot
drift apart.

**Client layout:** components, hooks, context and one reducer per concern. A
single `api()` helper owns the auth header and error shaping; a single
`useBoardPersistence` owns every write.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| **Client** | React 19, Vite 8, React Router 7, socket.io-client, lucide-react |
| **Server** | Node 22, Express 5, Mongoose 9, Socket.IO 4, jsonwebtoken, bcryptjs |
| **Database** | MongoDB (Atlas in deployment, `mongo:8` under Docker) |
| **Tests** | Vitest + Testing Library (client), Jest + Supertest + mongodb-memory-server (server) |
| **Docs** | OpenAPI 3 generated from JSDoc, served as Swagger UI |
| **Ops** | GitHub Actions, Docker Compose, Vercel, Render |

---

## Getting Started

**Prerequisites:** Node.js 20.19+ or 22.12+ (developed on Node 22), and a MongoDB
connection string — either Atlas or the Docker setup below.

```bash
git clone https://github.com/lynx7843/CollabBoard.git
cd CollabBoard
```

**1. API**

```bash
cd server
npm install
cp .env.example .env      # fill in MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:5000
```

**2. Client**, in a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so both halves run
against each other with no further configuration.

### Other commands

```bash
# server/
npm test              # Jest against an in-memory MongoDB
npm start             # production start

# client/
npm test              # Vitest, once
npm run test:watch
npm run test:coverage
npm run build         # production build
npm run preview       # serve that build
npm run lint
```

---

## Running with Docker

The whole stack on one machine, with nothing installed but Docker:

```bash
docker compose up --build      # then open http://localhost:8080
```

| Service | What it runs | Where |
| --- | --- | --- |
| `client` | nginx serving the Vite build | http://localhost:8080 |
| `server` | Node 22, Express + Socket.IO | http://localhost:5000 (docs at `/api/docs`) |
| `mongo` | `mongo:8`, data in a named volume | inside the compose network |

`docker compose down` stops it and keeps the data; `down -v` discards the
database too. **The deployed instance does not use this file** — it runs on
Vercel and Render against Atlas, so the `mongo` service has no counterpart there.

Three things in it are deliberate:

* **The API port is published** even though nginx proxies `/api`, because the
  browser connects the WebSocket straight to the API — exactly as in the
  deployment. The compose stack therefore exercises the same CORS allowlist.
* **`client/nginx.conf` mirrors `client/vercel.json`**: an SPA fallback so
  `/boards/:slug` survives a refresh, plus a same-origin `/api`.
* **`NODE_ENV=development` on the API.** Under `production` Mongoose skips
  `autoIndex`, and this database starts empty — the unique indexes on username
  and email would never be built.

---

## Project Structure

```
CollabBoard/
├── client/
│   ├── src/
│   │   ├── components/     Board, tabs, members, settings, auth, conflict dialog
│   │   ├── context/        AuthContext — the session
│   │   ├── hooks/          useBoards, useBoardSockets
│   │   ├── reducers/       boardReducer — the board's state machine
│   │   ├── utils/          storage, taskRequests, replayQueue, useBoardPersistence
│   │   ├── demo/           Stub layer for running the UI with no API
│   │   ├── api.js          The one place a REST call is built
│   │   └── socket.js       The one socket connection
│   ├── nginx.conf          Docker: SPA fallback + /api proxy
│   └── vercel.json         Vercel: the same two rules
├── server/
│   ├── src/
│   │   ├── routes/         Endpoints + the OpenAPI blocks above them
│   │   ├── controllers/    auth, board, task, user
│   │   ├── models/         User, Board, Task
│   │   ├── middleware/     requireAuth, rateLimit, errorHandler, notFound
│   │   ├── validators/     Request shapes, sharing rules with the models
│   │   ├── config/         env, db
│   │   ├── utils/          token, ApiError, patterns, origins, publicUser
│   │   ├── docs/           OpenAPI spec assembly
│   │   └── socket.js       Socket.IO: auth, rooms, emits
│   ├── tests/              9 suites
│   └── index.js            HTTP server + socket, boot and shutdown
├── docker-compose.yml
└── .github/workflows/ci.yml
```

The `.jsx` files at the root of `client/src` (`skeleton`, `Login`,
`Create_account`) are Tailwind design drafts. Nothing imports them and they are
tree-shaken out of the bundle; the live components are styled to match them.

---

## The API

Every route is under `/api`, and every one but registration, login and health
requires `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/users/me` | The signed-in account |
| `PATCH` | `/users/me` | Change username or email |
| `PATCH` | `/users/me/password` | Change password, verifying the current one |
| `GET` | `/users/lookup` | Resolve an email to an account, for invites |
| `GET` | `/boards` | Boards the caller belongs to, plus `canCreate` |
| `POST` | `/boards` | Create a board (admin only, capped at 5) |
| `DELETE` | `/boards/:boardId` | Delete a board and its tasks (admin only) |
| `GET` | `/boards/search` | Find the board to open for a search term |
| `GET` | `/boards/:boardId/members` | The board's members |
| `POST` | `/boards/:boardId/members` | Invite by email |
| `DELETE` | `/boards/:boardId/members/:userId` | Remove a member |
| `GET` | `/boards/:boardId/tasks` | Tasks, grouped by column |
| `POST` | `/boards/:boardId/tasks` | Create a task |
| `PATCH` | `/boards/:boardId/tasks/:taskId` | Update or move a task |
| `DELETE` | `/boards/:boardId/tasks/:taskId` | Delete a task |
| `GET` | `/health` | Database state and uptime |

`:boardId` is the board's slug, so URLs read `/api/boards/q3-roadmap/tasks`.

**Interactive docs** are at `/api/docs`, generated from the `@openapi` blocks
above each route (`ENABLE_API_DOCS=false` turns them off). A test fails if a
route is added without documentation, or documented without existing — so the
docs cannot silently rot.

**One error contract.** Every failure answers `{ message, details? }` with a
message written to be shown to a person. Only errors the API means to expose
have their message forwarded; anything unexpected is logged in full and reported
as a flat `500`.

---

## Real-time updates

Two people on the same board see each other's changes without refreshing. The
server holds one Socket.IO room per board, keyed by slug, so a change only
reaches the people looking at that board.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `join-board` | board slug |
| client → server | `leave-board` | board slug |
| server → client | `task:created` | the new task |
| server → client | `task:updated` | the whole task, after the change |
| server → client | `task:deleted` | the task's id |

Events are emitted after the write commits, carrying the same payload the writer
received in its HTTP response, so no client holds a different version of a task
than it would get by refetching. A move is a status change, so it travels as
`task:updated`; the reducer relocates the card when the status disagrees with the
column it is in. The writer is in the room too and receives its own event back —
that is what keeps a second tab in sync, and the reducer ignores a task it
already holds rather than drawing it twice.

**The connection is authenticated.** A WebSocket handshake has no `Authorization`
header, so the client sends its JWT in the handshake payload; the server verifies
it against a live account and checks board membership before honouring a
`join-board`. Knowing a slug is not enough to listen to a board.

Rooms live on the server's side of a connection, so the client rejoins on every
`connect` — a socket that drops and reconnects would otherwise come back knowing
nothing about the board on screen.

*Files:* `server/src/socket.js`, `client/src/socket.js`,
`client/src/hooks/useBoardSockets.js`. *Tests:* `server/tests/tasks.realtime.test.js`.

---

## Concurrent edits

Two people can open the same card. Without a check, whoever saves second wins and
the first edit disappears with nothing said.

Every task carries a `version`, incremented on each change that sticks. An edit
sends the version it was written against:

```
PATCH /api/boards/:boardId/tasks/:taskId
{ "title": "Rewrite the intro", "expectedVersion": 3 }
```

Still at 3, and the write is applied and the version becomes 4. Not at 3, and
nothing is written — the answer is `409` carrying the server's copy:

```json
{
  "message": "This task was changed by someone else while you were editing it.",
  "latest": { "_id": "…", "title": "Someone else's title", "version": 4 }
}
```

The client shows both versions in a dialog. *Keep mine* re-sends the edit rebased
onto the version the server holds, so it is applied rather than refused a second
time; *keep theirs* abandons it.

`expectedVersion` is optional, and what omits it matters as much as what sends it:
**content edits send it**, because losing typed text is worth interrupting for;
**moves do not**, because dragging a card is a whole-card intent, not a merge of
two people's text — last writer wins, and the move still bumps the version. A
malformed `expectedVersion` is a `400` rather than a shrug: ignoring one would
switch the protection off exactly when a client believed it was on.

A conflict is rarer than it sounds, because the socket usually delivers the other
person's change first and the next edit quotes the version that just arrived. A
`409` therefore means the change did *not* reach this client — an offline tab, a
dropped socket, or a genuine race. That is precisely when a silent overwrite
would otherwise happen.

*Tests:* `server/tests/tasks.conflict.test.js`.

---

## Offline support

Work in progress survives a refresh and a brief network loss.

**One write path.** `BoardView` never calls the API for a change. It describes
what happened — `CREATE_TASK`, `UPDATE_TASK`, `MOVE_TASK`, `DELETE_TASK` — and
hands it to `useBoardPersistence.submitAction`, which is what puts the queue in
the path of every edit rather than beside it. The card is drawn immediately
either way.

**No `/actions` endpoint.** An action is translated into the ordinary REST call it
corresponds to (`utils/taskRequests.js`), so a replayed change goes through the
same API a live one does.

**A cache and a queue.** Every version of the board is written to `localStorage`.
If the tasks request fails, the board renders the last copy this device saw and
says so. The tab strip is cached too — without it a reload while offline would
have no board to open. Changes made while unreachable are queued, and the status
bar reports how many are waiting.

**Replaying it** is its own module (`utils/replayQueue.js`) because order is the
hard part: a task created offline has a local id, so every edit queued behind it
names a task the server has never heard of. The create is replayed first, its new
id is mapped, and the rest of the queue is rewritten to use it.

| Outcome | What happens |
| --- | --- |
| Applied | Dropped from the queue; a create's new id is remembered for the changes behind it |
| Unreachable again | Kept, and the drain stops — the rest stays in order behind it |
| `409` conflict | Kept, the drain stops, and the dialog opens. One dialog, not one per queued change |
| Refused (`400`/`404`) | Dropped — the task was deleted while this device was away, and replaying it would fail identically |

*Tests:* `client/src/utils/replayQueue.test.js`.

---

## Security

* **Passwords** are bcrypt hashed at 12 rounds. The hash is `select: false` on
  the model and stripped again in `toJSON`, so it cannot leave the API even by
  accident.
* **Login is timing-equalised.** An unknown username is compared against a decoy
  hash, and wrong-password and no-such-user answer identically, so the endpoint
  cannot be used to enumerate accounts.
* **The JWT carries only the user id.** Everything else is read from the database
  on the request that needs it, so a token cannot assert a claim the database
  disagrees with, and one for a deleted account is rejected.
* **Privilege-escalation guard.** A user cannot rename themselves into the
  configured admin username, since admin rights are derived from it.
* **Rate limits** on register, login, the invite lookup and the password change.
  Successful attempts are not counted, so a user with the right password is never
  locked out by someone else guessing from the same address.
* **CORS allowlist** shared by the REST middleware and the Socket.IO handshake,
  with wildcard support for preview subdomains — see
  [Preview deployments](#preview-deployments).
* **Also:** a 100 kb JSON body cap, `trust proxy`, `x-powered-by` disabled,
  regex-escaped user input on search, and stack traces suppressed in production.

---

## Tests

```bash
cd server && npm test     # 125 tests, 9 suites
cd client && npm test     #  37 tests, 4 suites
```

**Server — Jest + Supertest against a real in-memory MongoDB**, not a mocked one,
so unique indexes and the duplicate-key path are genuinely exercised. Nine
suites: registration, login, membership, search, account changes, CORS origins,
real-time events, concurrent edits, and the documentation check.

**Client — Vitest + Testing Library** (`jsdom`), four suites chosen where a
regression would be silent rather than obvious:

| Suite | What it holds down |
| --- | --- |
| `boardReducer.test.js` | Where real-time events meet optimistic updates: your own echo ignored, someone else's move relocating the card, an edit not reordering its column |
| `replayQueue.test.js` | Replay order, rewriting a local id to the server's, and what a conflict, a dropped connection or a refusal each do to the rest of the queue |
| `LoginForm.test.jsx` | That a failed login shows the server's own message, and that the dev-only test-account hint is absent from a production build |
| `BoardTabs.test.jsx` | That a non-admin is offered neither "New Board" nor a delete control, and the admin gets the cap notice at the limit |

### Continuous integration

`.github/workflows/ci.yml` runs both halves in parallel on every pull request and
every push to `main`:

* **API** — `npm ci && npm test`, with the MongoDB binary cached between runs.
* **Client** — `npm ci && npm test && npm run build`. The build is a check in its
  own right: it is what Vercel runs, and it catches an import that resolves in
  dev but not in a bundle.

---

## Environment Variables

Two sets. The API reads a `.env` file or the host's environment; the client's are
compiled into the bundle by Vite. Copy the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### API (`server/.env`)

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | **yes** | — | The server refuses to boot without it |
| `JWT_SECRET` | **yes** | — | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MONGODB_DB` | no | `collabboard` | Database name |
| `CLIENT_ORIGIN` | in production | `http://localhost:5173` | CORS allowlist, comma-separated; `*` may stand in for one hostname label |
| `ADMIN_USERNAME` | in production | `dilan_amantha` | The one account that may create and delete boards |
| `NODE_ENV` | in production | `development` | `production` also suppresses stack traces in responses |
| `PORT` | no | `5000` | Injected by the host — do not set it there |
| `JWT_EXPIRES_IN` | no | `7d` | |
| `BCRYPT_ROUNDS` | no | `12` | |
| `ENABLE_API_DOCS` | no | `true` | `false` keeps Swagger UI off a public deployment |

Only the first two are enforced at boot. Because the rest fall back silently, the
server prints its effective configuration on startup and warns about anything
left at a development default — worth checking in the deploy log:

```
CollabBoard API listening on http://localhost:5000 (production)
  config: env=production  db=collabboard  admin=dilan_amantha  origins=https://collab-board-six-kappa.vercel.app  docs=on
```

### Client (`client/.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_DEMO_MODE` | unset (off) | `true` enables the stub layer. Never on a deployed build |
| `VITE_API_URL` | `http://localhost:5000` | Where the browser reaches the API for the WebSocket |

Vite bakes `VITE_*` into the bundle **at build time**, so changing one needs a
rebuild or a redeploy — restarting is not enough. Nothing secret belongs in
these: they ship to the browser in plain text.

---

## Deployment

| Part | Host | Notes |
| --- | --- | --- |
| `client/` | Vercel | Static Vite build |
| `server/` | Render | Always-on process, needed for Socket.IO |
| Database | MongoDB Atlas | Network access must allow the host's egress |

### Vercel project settings

This is a monorepo with no `package.json` at the root, so **Root Directory must
be `client`** or the build fails with no project to install.

| Setting | Value | Set in |
| --- | --- | --- |
| Root Directory | `client` | Dashboard — **required** |
| Node.js Version | 22.x | Dashboard |
| Framework / Install / Build / Output | Vite / `npm install` / `npm run build` / `dist` | `client/vercel.json` |

The last four are pinned in `client/vercel.json`, which takes precedence over the
dashboard, so a build is reproducible from the repository. That file also carries
the two rewrites — `/api/*` to the API host, then everything else to
`/index.html` — in that order, because the API rule must not be swallowed by the
SPA catch-all.

### Preview deployments

Every Vercel preview build gets a generated subdomain, so a `CLIENT_ORIGIN`
holding only the production URL blocks them. REST survives it — same-origin
through the rewrite — but the socket is cross-origin, so real-time is the part
that breaks, silently. Entries therefore accept a `*` in place of one hostname
label:

```
CLIENT_ORIGIN=https://collab-board-six-kappa.vercel.app,https://collab-board-*.vercel.app
```

The wildcard never crosses a dot, so that admits this project's previews and not
`https://collab-board-x.attacker.vercel.app`. Keep it narrow —
`https://*.vercel.app` would admit every project on the host.

---

## Demo Mode

A stub layer for showing the interface with no API running: it short-circuits the
calls that would fail and fakes nothing else. Login accepts `user` / `password`,
the board renders sample tasks held in memory, and the socket connection is
skipped.

It is **off by default** — the app talks to the real API unless you opt in:

```bash
# client/.env
VITE_DEMO_MODE=true
```

> While demo mode is on, login accepts hard-coded credentials with no server.
> Never enable it on a deployed build. The default is inverted deliberately, so a
> forgotten variable fails safe.

---

## Contributors

| Account Name | Name |
| --- | --- |
| lynx7843 | EADA EDIRISINGHA |
| samithakahawita25-rgb | KDS MADURANGA |
| KumudithaRupz | KGKSA RUPASENA |
| Nithila33934 | WNS SILVA |
| pabasari-janakalani  | PJ JAYAKODI  |
| pktfernando | PKT FERNANDO  |
| SayuniDHS | SDH SENANAYAKE |
| ukdbdeshan | UKDB DESHAN |
| upeka200163 | MGGU SEWWANDI |
| wsklwithana  | WSKL WITHANA |

---

## Known Limitations

* **Rate limits are per-instance and in-memory.** They reset on every deploy or
  restart — including when a sleeping free-tier host wakes — and two instances
  behind a load balancer would each allow the full quota. Correct for the single
  instance this runs on; a shared store (Redis) is the fix if it is ever scaled
  out.
* **The JWT is kept in `localStorage`,** so any XSS could read it. The standard
  alternative, an httpOnly cookie, brings CSRF handling with it and is out of
  scope for this module.
* **The API sleeps when idle** on its free tier, so the first request after a
  quiet spell is slow.
* **No drag-and-drop.** Tasks move with the **Change** button on each card.
  (`@dnd-kit` is installed but unused.)
* **Desktop-first.** The layout is optimised for desktop browsers.
