# CollabBoard — Frontend Socket.io Client

Real-time client for the board screen. Listens for `task_moved` and
`task_updated` broadcast by the Express/Socket.io server and keeps the
board's local state in sync, while surfacing conflicting updates instead
of silently overwriting them.

## Files

- `src/lib/socket.js` — one shared `socket.io-client` instance for the tab.
- `src/context/SocketContext.jsx` — connects on mount, disconnects on
  unmount, exposes `{ socket, status }` via `useSocket()`.
- `src/hooks/useBoardSocket.js` — joins/leaves the board's room, applies
  `task_moved`/`task_updated` events, and calls `onConflict(...)` when an
  incoming event is stale or clashes with a concurrent local edit.
- `src/components/Board.jsx`, `Column.jsx`, `TaskCard.jsx` — minimal UI
  wired to the hook, including a live "Live / Reconnecting…" indicator and
  a conflict banner.

## Wiring it up

```jsx
// App.jsx
import { SocketProvider } from "./context/SocketContext";
import Board from "./components/Board";

export default function App() {
  return (
    <SocketProvider>
      <Board boardId={currentBoardId} />
    </SocketProvider>
  );
}
```

## Environment

Set the socket server URL (Vite or CRA):

```
VITE_SOCKET_URL=http://localhost:4000
# or
REACT_APP_SOCKET_URL=http://localhost:4000
```

## Server-side contract this expects

```
client emits:  join_board   { boardId }
client emits:  leave_board  { boardId }
server emits:  task_moved   { taskId, fromColumn, toColumn, position, version, movedBy }
server emits:  task_updated { task: { _id, ...fields, version }, updatedBy }
```

Each task needs a `version` field (increment it on every server-side
write) — that's what lets the client tell a genuinely newer update apart
from a stale/out-of-order one, per the project's concurrent-edit
requirement.

## Not included here

The Express Socket.io server, REST endpoints, auth middleware, and
Jest/Supertest CI setup are backend pieces — happy to build those next if
you want the full loop working end to end.
