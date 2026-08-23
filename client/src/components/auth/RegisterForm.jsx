import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { DEMO_MODE } from '../../demo/demoMode';
import { colors, shadowSm } from '../../theme';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginSession } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // There is no sign-up endpoint yet, so any submission reports that
    // rather than pretending an account was created.
    if (DEMO_MODE) {
      setError('Backend not yet implemented — accounts cannot be created yet.');
      return;
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      // Automatically log user in upon successful registration
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
          <h2 style={styles.title}>Create account</h2>
          <p style={styles.subtitle}>Set up your details to start building boards.</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}

            {/* Email */}
            <div>
              <label htmlFor="register-email" style={styles.label}>Email</label>
              <div style={styles.field}>
                <Mail size={20} style={styles.fieldIcon} />
                <input
                  id="register-email"
                  className="cb-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="register-username" style={styles.label}>Username</label>
              <div style={styles.field}>
                <User size={20} style={styles.fieldIcon} />
                <input
                  id="register-username"
                  className="cb-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" style={styles.label}>Password</label>
              <div style={styles.field}>
                <Lock size={20} style={styles.fieldIcon} />
                <input
                  id="register-password"
                  className="cb-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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

            {/* Confirm password */}
            <div>
              <label htmlFor="register-confirm-password" style={styles.label}>Re-enter password</label>
              <div style={styles.field}>
                <Lock size={20} style={styles.fieldIcon} />
                <input
                  id="register-confirm-password"
                  className="cb-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ ...styles.input, paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide re-entered password' : 'Show re-entered password'}
                  className="cb-icon-btn"
                  style={styles.eyeButton}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="cb-new-task" style={styles.button}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className="cb-link" style={styles.link}>
            Log in
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
    padding: '40px 16px',
    backgroundColor: colors.gray50,
    color: colors.black,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflowY: 'auto',
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

export default RegisterForm;
