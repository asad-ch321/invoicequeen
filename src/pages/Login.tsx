import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Crown, MailCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(location.pathname === '/signup');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (isSignUp) {
      const { error, needsConfirmation } = await signUp(email, password);
      if (error) setError(error.message);
      else if (needsConfirmation) setConfirmSent(true);
      // if no confirmation needed, onAuthStateChange logs them in and redirects
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  // ----- Check your email screen (after signup) -----
  if (confirmSent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="confirm-icon"><MailCheck size={36} /></div>
            <h1>Check your email</h1>
            <p>
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account, then sign in.
            </p>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => { setConfirmSent(false); setIsSignUp(false); setPassword(''); }}
          >
            Back to Sign In
          </button>
          <p className="login-toggle" style={{ marginTop: 16 }}>
            Didn’t get it? Check your spam folder, or{' '}
            <button onClick={() => setConfirmSent(false)} className="link-btn">try again</button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="brand-icon-link"><Crown size={40} className="brand-icon" /></Link>
          <h1>InvoiceQueen</h1>
          <p>Premium invoicing for modern businesses</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p className="login-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="link-btn">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
        <p className="login-toggle">
          <Link to="/" className="link-btn">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
