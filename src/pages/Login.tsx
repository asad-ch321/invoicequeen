import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Crown size={40} className="brand-icon" />
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
      </div>
    </div>
  );
}
