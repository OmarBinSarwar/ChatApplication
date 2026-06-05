import React, { useState } from 'react';
import { fetchApi } from '../lib/api';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';


export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('email', formData.email);
        payload.append('password', formData.password);
        if (file) payload.append('avatar', file);

        const user = await fetchApi('/api/auth/register', {
          method: 'POST',
          body: payload,
        });
        
        // Auto-login after register
        const loggedInUser = await fetchApi('/api/auth/login', {
          method: 'POST',
          body: { email: formData.email, password: formData.password },
        });
        onLogin(loggedInUser);
      } else {
        const user = await fetchApi('/api/auth/login', {
          method: 'POST',
          body: { email: formData.email, password: formData.password },
        });
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-box glass">
          <div className="auth-header-brand">
            <MessageSquare className="auth-logo-icon" size={32} />
            <h1 className="auth-logo">OBS ChatApp</h1>
          </div>
          <h2>{isRegister ? 'Create an Account' : 'Welcome Back'}</h2>
          {error && <div style={{ color: '#ff4d4f', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                className="form-control" 
                required 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  required 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {isRegister && (
              <div className="form-group">
                <label>Avatar (Optional)</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])} 
                />
              </div>
            )}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Log In')}
            </button>
          </form>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <span 
              style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
      <footer className="auth-footer">
        <p>&copy; {new Date().getFullYear()} OBS ChatApp. Designed & Developed by Omar Bin Sarwar.</p>
      </footer>
    </div>
  );
}
