import React, { useState } from 'react';
import { fetchApi } from '../lib/api';
import { MessageSquare, Eye, EyeOff, Mail, Lock, User, Upload, CheckCircle2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', gender: '' });
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
        payload.append('gender', formData.gender);
        if (file) payload.append('avatar', file);

        await fetchApi('/api/auth/register', {
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
    <div className="login-page-container">
      <div className="login-split-card glass">
        
        {/* Left Side: Hero Area */}
        <div className="login-hero">
          <div className="login-hero-overlay"></div>
          <div className="login-hero-content">
            <div className="hero-logo-wrapper">
              <MessageSquare className="hero-logo-icon" size={48} />
            </div>
            <h1 className="hero-title">OBS ChatApp</h1>
            <p className="hero-subtitle">Connect seamlessly with your friends, colleagues, and communities in real-time.</p>
            
            <div className="hero-features">
              <div className="hero-feature">
                <CheckCircle2 size={18} className="hero-feature-icon" />
                <span>Lightning fast messaging</span>
              </div>
              <div className="hero-feature">
                <CheckCircle2 size={18} className="hero-feature-icon" />
                <span>Beautiful modern design</span>
              </div>
              <div className="hero-feature">
                <CheckCircle2 size={18} className="hero-feature-icon" />
                <span>Secure & reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Area */}
        <div className="login-form-side">
          <div className="login-form-header">
            <h2>{isRegister ? 'Create an Account' : 'Welcome Back'}</h2>
            <p>{isRegister ? 'Join the community today.' : 'Please enter your details to sign in.'}</p>
          </div>

          <div className="login-tabs">
            <button 
              type="button" 
              className={`login-tab ${!isRegister ? 'active' : ''}`} 
              onClick={() => { setIsRegister(false); setError(''); }}
            >
              Log In
            </button>
            <button 
              type="button" 
              className={`login-tab ${isRegister ? 'active' : ''}`} 
              onClick={() => { setIsRegister(true); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <div className="form-group modern-input-group">
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    className="form-control modern-input" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
              </div>
            )}
            
            <div className="form-group modern-input-group">
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="Email Address"
                  className="form-control modern-input" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-group modern-input-group">
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password"
                  className="form-control modern-input" 
                  required 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn modern" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="form-row">
                <div className="form-group modern-input-group" style={{ flex: 1 }}>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <select
                      className="form-control modern-input"
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="" disabled>Gender</option>
                      <option value="boy">Boy</option>
                      <option value="girl">Girl</option>
                    </select>
                  </div>
                </div>
                <div className="form-group modern-input-group" style={{ flex: 1 }}>
                  <label className="file-upload-label">
                    <Upload size={18} className="input-icon" style={{ position: 'static', margin: 0 }} />
                    <span className="file-upload-text">{file ? file.name.substring(0, 10) + '...' : 'Avatar'}</span>
                    <input 
                      type="file" 
                      className="file-upload-input" 
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files[0])} 
                    />
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="btn login-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

        </div>
      </div>
      <footer className="login-footer">
        <p>&copy; {new Date().getFullYear()} OBS ChatApp. Designed & Developed by Omar Bin Sarwar.</p>
      </footer>
    </div>
  );
}
