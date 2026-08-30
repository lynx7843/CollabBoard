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

### Implemented but awaiting a backend

* **Real-Time Collaboration:** A Socket.io client and board event handlers are wired up, but there is no server to connect to.
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
* **No real-time sync:** Multiple browser tabs do not see each other's changes.
* **No drag-and-drop:** Tasks are moved with the **Change** button on each card.
* **Desktop-first:** The layout is optimised for desktop browsers.
