import { useState } from 'react';
import { createClient } from '../../lib/supabase/client.js';
import './AuthScreen.css';

/**
 * Authentication Screen
 * Handles both sign-in and sign-up flows
 */
export function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        console.log('✅ Signed in successfully');
        onAuthSuccess?.();
      } else {
        // Sign Up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) throw signUpError;

        setMessage('✅ Check your email to confirm your account!');
        console.log('✅ Signed up successfully - check email for confirmation');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setMessage('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        {/* DAGGER Logo */}
        <div className="auth-header">
          <h1 className="auth-logo">🗡️ DAGGER</h1>
          <p className="auth-subtitle">Distributed AGGregated Exploration and Reasoning</p>
        </div>

        {/* Auth Form */}
        <div className="auth-card">
          <h2 className="auth-title">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
              {mode === 'signup' && (
                <small className="form-hint">At least 6 characters</small>
              )}
            </div>

            {error && (
              <div className="auth-error">
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="auth-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="auth-toggle">
            <button
              type="button"
              onClick={toggleMode}
              className="auth-toggle-btn"
              disabled={loading}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Info Footer */}
        <div className="auth-footer">
          <p className="auth-info">
            🔐 Your Claude API key will be encrypted and stored securely
          </p>
          <p className="auth-info-small">
            You'll configure your API key after signing in
          </p>
        </div>
      </div>
    </div>
  );
}
