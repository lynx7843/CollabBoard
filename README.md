# CollabBoard

A real-time, collaborative Kanban-style task board designed for seamless team productivity. CollabBoard features a clean, high-contrast interface to eliminate distractions and keep the focus entirely on your work.

## Project Status

> **Frontend only.** The React client is running and presentable. The backend has **not been implemented yet** — `server/` currently contains dependencies but no source code.
>
> To keep the client usable without an API, it runs in **demo mode**: authentication, board data, and member management are stubbed on the client. See [Demo Mode](#demo-mode) below.

## Features

### Working now (client-side)

* **Kanban Board:** Three columns — To Do, Doing, Done — with live task counts.
* **Task Management:** Create tasks from the board header or any column, edit a task's title and description, move a task between columns, and delete it.
* **Member Management:** View the board's member list, invite by email, and remove members.
* **Authentication Flow:** Login and create-account screens with protected routes and a logout action.
* **Responsive Layout:** Columns grow to fill the board area and scroll horizontally on narrow screens.

### Working now (real-time)

* **Real-Time Collaboration:** Task creates, edits, moves and deletes are broadcast over Socket.IO to everyone viewing the same board. See [Real-Time Updates](#real-time-updates).

### Implemented but awaiting a backend

* **Offline Support:** Client-side caching and an offline action queue are implemented in `useBoardPersistence`.
* **Conflict Resolution:** The client detects HTTP 409 responses and shows a resolution dialog rather than silently overwriting.

### Not yet started

* Backend API, database, and JWT authentication
* Automated tests and CI
* Drag-and-drop (`@dnd-kit` is installed but not yet used — tasks move via the **Change** button)

## Tech Stack

| Area | Technology |
| --- | --- |
| **Frontend** | React 19, Vite 8, React Router 7, lucide-react |
| **Real-Time** | socket.io-client *(client wired, server pending)* |
| **Backend** | Node.js, Express, Mongoose, Socket.io *(dependencies declared, not implemented)* |
| **Tooling** | ESLint |

## Project Structure

```
CollabBoard/
├── client/                  # React frontend (the runnable app)
│   └── src/
│       ├── components/      # Board, layout, member, and auth UI
│       ├── context/         # AuthContext
│       ├── hooks/           # useBoardSockets
│       ├── reducers/        # boardReducer
│       ├── utils/hooks/     # useBoardPersistence, storage
│       ├── demo/            # Demo-mode stubs (remove once the API exists)
│       ├── theme.js         # Shared colour palette
│       ├── skeleton.jsx     # UI design draft — board
│       ├── Login.jsx        # UI design draft — login
│       └── Create_account.jsx  # UI design draft — sign up
└── server/                  # Backend — not yet implemented
```

The `.jsx` design drafts at the root of `src/` are Tailwind reference mockups, not part of the running app. The live components are styled to match them.

## Getting Started

### Prerequisites

* **Node.js 20.19+ or 22.12+** (developed on Node 22)
* npm

No database, Docker, or backend setup is required — the frontend runs standalone.

### Run the app

1. Clone the repository:
   ```bash
   git clone https://github.com/lynx7843/CollabBoard.git
   cd CollabBoard
   ```
2. Install the frontend dependencies:
   ```bash
   cd client
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open **http://localhost:5173** in your browser.

### Other commands

Run these from the `client/` directory:

```bash
npm run build     # production build
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## API Documentation

The server publishes an OpenAPI 3 spec generated from `@openapi` blocks that sit
directly above each route in `server/src/routes/`, so an endpoint and its
description are edited in the same place.

With the server running:

| URL | What it is |
| --- | --- |
| <http://localhost:5000/api/docs> | Swagger UI — browse every endpoint and call it with **Try it out** |
| <http://localhost:5000/api/docs.json> | The raw spec, for Postman, Insomnia or client codegen |

Everything except `/health`, `/auth/register` and `/auth/login` needs a bearer
token: call register or login, copy the returned `token`, and paste it into
**Authorize** at the top of the page. It is remembered across reloads.

The shared pieces — server list, the JWT scheme, and the `User` / `Board` /
`Task` / `Error` schemas — live in `server/src/docs/openapi.js`. Set
`ENABLE_API_DOCS=false` to keep the UI off a deployment.

`server/tests/docs.openapi.test.js` fails if a route is added without an
`@openapi` block, or if the spec describes a route that no longer exists.

## Real-Time Updates

Two people on the same board see each other's changes without refreshing. The
server holds one Socket.IO room per board, keyed by the board's slug — the same
id the REST routes address a board by — so a change only reaches the people
looking at that board.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `join-board` | board slug |
| client → server | `leave-board` | board slug |
| server → client | `task:created` | the new task |
| server → client | `task:updated` | the whole task, after the change |
| server → client | `task:deleted` | the task's id |

The events are emitted by `taskController` after the write commits, carrying the
same payload the writer received in its HTTP response — so no client ends up
holding a different version of a task than the one it would get by refetching.
A move is a status change, so it travels as `task:updated`; `boardReducer`
relocates the card when the status disagrees with the column it is sitting in.
The writer is in the room too and receives its own event back, which is what
keeps a second tab of the same session in sync; the reducer ignores a task it
already holds rather than drawing it twice.

**The connection is authenticated.** A WebSocket handshake has no `Authorization`
header, so `client/src/socket.js` sends the session's JWT in the handshake
payload and `server/src/socket.js` verifies it — then checks board membership
before honouring a `join-board`. Knowing a board's slug is not enough to listen
to it, which matches the REST side answering a non-member with 404.

Files: `server/src/socket.js`, `server/index.js` (the HTTP server the upgrade
needs), `client/src/socket.js`, `client/src/hooks/useBoardSockets.js`. Covered by
`server/tests/tasks.realtime.test.js`.

Two settings have to line up or the socket silently never connects:
`VITE_API_URL` on Vercel must point at the API host (a rewrite cannot carry a
WebSocket upgrade), and `CLIENT_ORIGIN` on the API host must list the Vercel
domain.

## Environment Variables

Two separate sets: the API server reads a `.env` file (or the host's environment
UI), and the client's are compiled into the bundle by Vite. Copy the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### API server (`server/.env`)

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | **yes** | — | Atlas connection string. The server refuses to boot without it. |
| `JWT_SECRET` | **yes** | — | Long random hex: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MONGODB_DB` | no | `collabboard` | Database name. |
| `CLIENT_ORIGIN` | in production | `http://localhost:5173` | CORS allowlist, comma-separated. Must list the deployed client URL. |
| `ADMIN_USERNAME` | in production | `dilan_amantha` | The one account that may create and delete boards. |
| `NODE_ENV` | in production | `development` | Set to `production` on the API host; also suppresses stack traces in error responses. |
| `PORT` | no | `5000` | Injected by the host — do not set it there, and do not hardcode it. |
| `JWT_EXPIRES_IN` | no | `7d` | |
| `BCRYPT_ROUNDS` | no | `12` | |
| `ENABLE_API_DOCS` | no | `true` | `false` keeps Swagger UI off a public deployment. |

Only the first two are enforced at boot. Because the rest fall back silently, the
server prints its effective configuration on startup and warns in production
about anything left at a development default — check that line in the deploy log
after the first deploy:

```
CollabBoard API listening on http://localhost:5000 (production)
  config: env=production  db=collabboard  admin=dilan_amantha  origins=https://collabboard.vercel.app  docs=on
```

### Client (`client/.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_DEMO_MODE` | unset (off) | `true` enables the offline stub layer. Leave it off for anything deployed. |
| `VITE_API_URL` | `http://localhost:5000` | Origin of the API. Used by the Socket.IO connection; REST calls use relative `/api` paths. |

Vite only exposes `VITE_`-prefixed variables and **bakes them into the bundle at
build time**, so changing one needs a rebuild locally or a redeploy on the host —
restarting is not enough. Nothing secret belongs in these: they ship to the
browser in plain text.

### How the client reaches the API

Every REST call in the client uses a **relative** `/api/...` path — there is no
API base URL baked into the code. Two different things make that resolve:

* **Locally:** the Vite dev server proxies `/api` to `http://localhost:5000`
  (`client/vite.config.js`).
* **Deployed:** `client/vercel.json` rewrites `/api/:path*` to the API host, so
  the browser only ever talks to the Vercel origin. Requests are same-origin,
  which means no CORS preflight and no `Authorization` header stripped in
  between. Point that rewrite at your own API host if you redeploy the backend.

The Socket.IO connection is the exception: a rewrite does not carry a WebSocket
upgrade, so `client/src/socket.js` connects straight to `VITE_API_URL` and that
origin **must** be listed in the API's `CLIENT_ORIGIN`.

`client/vercel.json` carries a second rule after that one, rewriting everything
else to `/index.html`. React Router owns `/boards/:slug`, `/members/:slug` and
`/settings`, but a static host knows nothing about them and answers 404 when one
is opened directly — on a refresh, on a shared link, or when search jumps
straight to a board. The catch-all hands those paths the app instead. Order
matters: the `/api` rule has to come first, or API calls would be answered with
`index.html` too. Real files (`/assets/*`, the favicons) are still served as
themselves, because Vercel only applies a rewrite when nothing on disk matches.

## Deployment

The app is deployed as two separate services, because Socket.IO needs a process
that stays alive and holds open connections — which Vercel's serverless
functions do not:

| Part | Host | Notes |
| --- | --- | --- |
| `client/` | Vercel | Static Vite build. |
| `server/` | Render | https://syncspace-api-rxhi.onrender.com — Express + Socket.IO against Mongo Atlas. |

On Render's free tier the API sleeps after ~15 minutes idle, so the first request
after a quiet spell takes ~30s to wake it. Open the app once before demoing it.

### Vercel project settings

This is a monorepo with no `package.json` at the repository root, so **Root
Directory must be set to `client`** or the build fails immediately with no
project to install. That one is set in the Vercel dashboard (Settings → General)
and cannot live in a config file:

| Setting | Value | Where it is set |
| --- | --- | --- |
| Root Directory | `client` | Dashboard only — **required** |
| Node.js Version | 22.x | Dashboard only |
| Framework Preset | Vite | `client/vercel.json` |
| Install Command | `npm install` | `client/vercel.json` |
| Build Command | `npm run build` | `client/vercel.json` |
| Output Directory | `dist` | `client/vercel.json` |

The bottom four are pinned in `client/vercel.json`, which takes precedence over
the dashboard, so a build is reproducible from the repository rather than from
settings nobody can see in a diff. That file also carries the two rewrites
described under [How the client reaches the API](#how-the-client-reaches-the-api).

Set the client's build-time variables in Settings → Environment Variables
(`VITE_DEMO_MODE=false`, `VITE_API_URL=https://syncspace-api-rxhi.onrender.com`),
and remember that Vite bakes them in — changing one needs a redeploy.

## Demo Mode

Because there is no API yet, the client ships with demo mode enabled. It short-circuits only the calls that would fail — nothing else is faked.

**Log in with:**

| Field | Value |
| --- | --- |
| Username | `user` |
| Password | `password` |

These are also shown on the login screen. Any other credentials produce an error naming the field that was wrong.

What demo mode changes:

* Login accepts the credentials above without a server; **any** submission on the create-account screen reports that the backend is not implemented.
* The board renders seeded sample tasks, and edits are held in memory only — they do not survive a reload.
* The member list is pre-populated; invites and removals update local state only.
* The Socket.io connection and the board's initial `GET` are skipped, so the console stays clean.

Demo mode is controlled by a single flag in `client/src/demo/demoMode.js` and is **off by default** — the app talks to the real API unless you opt in:

```bash
# client/.env
VITE_DEMO_MODE=true
```

Vite bakes the value into the bundle at build time, so changing it requires a rebuild (or a redeploy), not just a restart.

> ⚠️ While demo mode is on, login accepts the hard-coded credentials with no server. Never enable it on a deployed build.

The Vite dev server already proxies `/api` to `http://localhost:5000`, so the client is ready to talk to a backend as soon as one is running.

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

## Known Limitations

* **No persistence:** With no backend, all board and member changes are lost on refresh.
* **No drag-and-drop:** Tasks are moved with the **Change** button on each card.
* **Desktop-first:** The layout is optimised for desktop browsers.
