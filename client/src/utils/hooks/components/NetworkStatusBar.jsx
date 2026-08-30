/*
 * The one place the board admits it is not talking to the server.
 *
 * Silence is the wrong default here: work done offline is kept and replayed, so
 * whoever is doing it needs to see both that it was kept and that it has not
 * landed yet. Renders nothing when there is nothing to say.
 */
export const NetworkStatusBar = ({ isOnline, isSyncing, message, pendingCount = 0 }) => {
  if (isOnline && !isSyncing && !message) return null;

  const pending = pendingCount
    ? ` ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync.`
    : '';

  return (
    <div className={`network-status ${!isOnline ? 'offline' : isSyncing ? 'syncing' : 'notice'}`} role="status">
      {!isOnline ? `Offline - your changes are being saved on this device.${pending}` : message}
    </div>
  );
};
