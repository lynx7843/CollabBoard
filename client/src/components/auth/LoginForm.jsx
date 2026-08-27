import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { DEMO_MODE, DEMO_TOKEN, DEMO_USER, DEMO_CREDENTIALS } from '../../demo/demoMode';
import { colors, shadowSm } from '../../theme';

/*
 * A real account seeded in MongoDB, shown while demo mode is off so the form
 * stays usable without registering first. Remove before this is deployed
 * anywhere real — it prints working credentials on the login screen.
 */
const TEST_ACCOUNT = {
  username: 'dilan',
  password: 'password123',
};

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginSession } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // No auth backend yet: check the demo credentials locally and report
    // which of the two fields was wrong.
    if (DEMO_MODE) {
      setLoading(false);

      if (username !== DEMO_CREDENTIALS.username) {
        setError(`Incorrect username. Expected "${DEMO_CREDENTIALS.username}".`);
        return;
      }
      if (password !== DEMO_CREDENTIALS.password) {
        setError(`Incorrect password. Expected "${DEMO_CREDENTIALS.password}".`);
        return;
      }

      loginSession(DEMO_TOKEN, { ...DEMO_USER, username });
      navigate('/boards');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid username or password');
      }

      loginSession(data.token, data.user);
      navigate('/boards');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.brand}>
          <h1 style={styles.brandTitle}>CollabBoard</h1>
        </div>

        <div style={styles.card}>
          <h2 style={styles.title}>Log in</h2>
          <p style={styles.subtitle}>Enter your details to get back to your boards.</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}

            {/* Username */}
            <div>
              <label htmlFor="login-username" style={styles.label}>Username</label>
              <div style={styles.field}>
                <User size={20} style={styles.fieldIcon} />
                <input
                  id="login-username"
                  className="cb-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" style={styles.label}>Password</label>
              <div style={styles.field}>
                <Lock size={20} style={styles.fieldIcon} />
                <input
                  id="login-password"
                  className="cb-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...styles.input, paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="cb-icon-btn"
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {DEMO_MODE ? (
              <p style={styles.hint}>
                Demo login — username: <strong>{DEMO_CREDENTIALS.username}</strong>
                {'  '}·{'  '}password: <strong>{DEMO_CREDENTIALS.password}</strong>
              </p>
            ) : (
              <p style={styles.hint}>
                Test account — username: <strong>{TEST_ACCOUNT.username}</strong>
                {'  '}·{'  '}password: <strong>{TEST_ACCOUNT.password}</strong>
              </p>
            )}

            <button type="submit" disabled={loading} className="cb-new-task" style={styles.button}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        <p style={styles.footerText}>
          New to CollabBoard?{' '}
          <Link to="/register" className="cb-link" style={styles.link}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
    backgroundColor: colors.gray50,
    color: colors.black,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  wrapper: {
    width: '100%',
    maxWidth: '448px',
  },
  brand: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '-0.025em',
    color: colors.black,
  },
  card: {
    borderRadius: '16px',
    border: `1px solid ${colors.gray200}`,
    backgroundColor: colors.white,
    padding: '32px',
    boxShadow: shadowSm,
  },
  title: {
    fontSize: '30px',
    fontWeight: 'bold',
    letterSpacing: '-0.025em',
    color: colors.black,
  },
  subtitle: {
    marginTop: '4px',
    fontSize: '14px',
    color: colors.gray500,
  },
  form: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorBox: {
    padding: '12px',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    color: '#DC2626',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.black,
  },
  field: {
    position: 'relative',
  },
  fieldIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: colors.gray400,
  },
  input: {
    width: '100%',
    borderRadius: '8px',
    border: `1px solid ${colors.gray300}`,
    backgroundColor: colors.white,
    padding: '12px 16px 12px 48px',
    fontSize: '14px',
    color: colors.black,
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    padding: '4px',
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    color: colors.gray400,
    cursor: 'pointer',
    transition: 'background-color 150ms, color 150ms',
  },
  hint: {
    padding: '10px 12px',
    backgroundColor: colors.yellow50,
    border: `1px solid ${colors.yellow200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.yellow900,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: '8px',
    backgroundColor: colors.yellow400,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.black,
    border: 'none',
    cursor: 'pointer',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '14px',
    color: colors.gray500,
  },
  link: {
    fontWeight: '600',
    color: colors.black,
    textDecoration: 'underline',
    textDecorationColor: colors.yellow400,
    textDecorationThickness: '2px',
    textUnderlineOffset: '4px',
    transition: 'text-decoration-color 150ms',
  },
};

export default LoginForm;
