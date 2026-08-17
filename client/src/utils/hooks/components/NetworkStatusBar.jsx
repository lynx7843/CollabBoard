export const NetworkStatusBar = ({ isOnline, isSyncing, message }) => {
  if (isOnline && !isSyncing && !message) return null;
  return <div className={`network-status ${!isOnline ? 'offline' : isSyncing ? 'syncing' : 'notice'}`} role="status">
    {!isOnline ? 'Offline - your changes are being saved locally.' : message}
  </div>;
};
