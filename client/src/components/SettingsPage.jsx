import { useContext, useEffect, useState } from 'react';
import { User, Mail, Lock, Check, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { colors, shadowSm } from '../theme';

/*
 * Account settings for the signed-in user.
 *
 * Frontend only for now: each card validates its own fields and reports the
 * outcome in its own banner, so a failed password change does not wipe the
 * "profile saved" message next to it. The two `saveProfile`/`savePassword`
 * calls below are the single places the API will be wired into later.
 */

// Stand-ins for the requests, so the forms already show their pending and
// resolved states. Replace the body with the real call; keep the shape.
const saveProfile = async () => new Promise((resolve) => setTimeout(resolve, 400));
const savePassword = async () => new Promise((resolve) => setTimeout(resolve, 400));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One banner element for both cards, so success and failure sit in the same
// spot and swapping between them does not move the fields under the cursor.
const Banner = ({ status }) => {
  if (!status) return null;
  const ok = status.type === 'success';
  const Icon = ok ? Check : AlertCircle;
  return (
    <p
      role="status"
      style={{
        ...styles.banner,
        backgroundColor: ok ? colors.yellow50 : '#fef2f2',
        border: `1px solid ${ok ? colors.yellow200 : '#fecaca'}`,
        color: ok ? colors.yellow900 : '#b91c1c',
      }}
    >
      <Icon size={15} />
      {status.message}
    </p>
  );
};

const Field = ({ id, label, icon: Icon, hint, ...inputProps }) => (
  <div style={styles.field}>
    <label htmlFor={id} style={styles.label}>
      <Icon size={14} />
      {label}
    </label>
    <input id={id} className="cb-input" style={styles.input} {...inputProps} />
    {hint && <span style={styles.hint}>{hint}</span>}
  </div>
);

export const SettingsPage = () => {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // The context user arrives after the stored session is read, so the fields
  // are filled once it lands rather than only at first render.
  useEffect(() => {
    setName(user?.name || user?.username || '');
    setEmail(user?.email || '');
  }, [user]);

  const displayName = user?.name || user?.username || 'Your account';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const profileDirty =
    name.trim() !== (user?.name || user?.username || '') || email.trim() !== (user?.email || '');

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileStatus(null);

    if (name.trim().length < 2) {
      setProfileStatus({ type: 'error', message: 'Username must be at least 2 characters.' });
      return;
    }
    if (!emailPattern.test(email.trim())) {
      setProfileStatus({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }

    setSavingProfile(true);
    try {
      await saveProfile({ name: name.trim(), email: email.trim() });
      setProfileStatus({ type: 'success', message: 'Profile updated.' });
    } catch (err) {
      setProfileStatus({ type: 'error', message: err.message || 'Could not update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordStatus({ type: 'error', message: 'New password must differ from the current one.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'The two new passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await savePassword({ currentPassword, newPassword });
      setPasswordStatus({ type: 'success', message: 'Password changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message || 'Could not change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.avatar}>{initials || 'U'}</div>
        <div>
          <h1 style={styles.title}>{displayName}</h1>
          <p style={styles.subtitle}>{user?.email || 'Manage your account details'}</p>
        </div>
      </header>

      <form onSubmit={handleProfile} style={styles.card}>
        <div>
          <h2 style={styles.cardTitle}>Profile</h2>
          <p style={styles.cardHint}>The name and address the rest of the board sees you by.</p>
        </div>

        <Banner status={profileStatus} />

        <Field
          id="settings-name"
          label="Username"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dilan Perera"
          maxLength={60}
          autoComplete="username"
        />
        <Field
          id="settings-email"
          label="Email"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => {
              setName(user?.name || user?.username || '');
              setEmail(user?.email || '');
              setProfileStatus(null);
            }}
            disabled={!profileDirty || savingProfile}
            style={{ ...styles.secondaryButton, opacity: profileDirty ? 1 : 0.5 }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={savingProfile || !profileDirty}
            className="cb-new-task"
            style={{ ...styles.primaryButton, opacity: savingProfile || !profileDirty ? 0.6 : 1 }}
          >
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <form onSubmit={handlePassword} style={styles.card}>
        <div>
          <h2 style={styles.cardTitle}>Password</h2>
          <p style={styles.cardHint}>Use at least 8 characters. You stay signed in after changing it.</p>
        </div>

        <Banner status={passwordStatus} />

        <Field
          id="settings-current-password"
          label="Current password"
          icon={Lock}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <Field
          id="settings-new-password"
          label="New password"
          icon={Lock}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          hint="Minimum 8 characters."
        />
        <Field
          id="settings-confirm-password"
          label="Confirm new password"
          icon={Lock}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <div style={styles.actions}>
          <button
            type="submit"
            disabled={savingPassword}
            className="cb-new-task"
            style={{ ...styles.primaryButton, opacity: savingPassword ? 0.6 : 1 }}
          >
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  page: { maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: {
    width: '56px',
    height: '56px',
    flexShrink: 0,
    borderRadius: '9999px',
    backgroundColor: colors.yellow400,
    color: colors.black,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  title: { margin: 0, fontSize: '22px', fontWeight: '700', color: colors.black },
  subtitle: { margin: '2px 0 0', fontSize: '14px', color: colors.gray500 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
    boxShadow: shadowSm,
  },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: colors.black },
  cardHint: { margin: '4px 0 0', fontSize: '13px', color: colors.gray500 },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: colors.gray600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
    fontSize: '14px',
    color: colors.black,
    outline: 'none',
  },
  hint: { fontSize: '12px', color: colors.gray400 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  secondaryButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.gray200}`,
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.gray600,
    cursor: 'pointer',
  },
  primaryButton: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.yellow400,
    fontSize: '14px',
    fontWeight: '700',
    color: colors.black,
    cursor: 'pointer',
  },
};

export default SettingsPage;
