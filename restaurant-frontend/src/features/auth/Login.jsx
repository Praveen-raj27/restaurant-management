
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Utensils } from 'lucide-react';

import authService from './authService';
import { setCredentials } from './authSlice';
import './Login.css';

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        email,
        password,
      });

      dispatch(setCredentials(response.data));

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Unable to sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Utensils size={26} />
          </div>
          <span>Restora</span>
        </div>

        <div className="login-brand-content">
          <span className="login-eyebrow">
            RESTAURANT MANAGEMENT SUITE
          </span>

          <h1>
            Your restaurant.
            <br />
            Your operations.
            <br />
            <span>One platform.</span>
          </h1>

          <p>
            Manage your restaurant operations,
            employees, tables and menu from
            one powerful platform.
          </p>
        </div>

        <div className="login-brand-footer">
          © 2026 Restora. All rights reserved.
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <Utensils size={24} />
            <span>Restora</span>
          </div>

          <span className="login-welcome">
            WELCOME BACK
          </span>

          <h2>Sign in to your account</h2>

          <p className="login-subtitle">
            Enter your credentials to access your workspace.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="login-register">
            Don't have an account?
            <Link to="/register"> Create restaurant</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
