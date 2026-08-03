import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { applyTheme, getUserPreferences } from '../lib/theme';
import { AuthContext } from '../lib/authContext';

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchApi('/api/auth/me')
      .then(data => {
        if (data.user) {
          setUser(data.user);
          const prefs = getUserPreferences(data.user);
          applyTheme(prefs.theme, prefs.accentColor);
          
          if (location.pathname === '/login') {
            navigate('/');
          }
        }
      })
      .catch(() => {
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      })
      .finally(() => setLoading(false));
  }, []); // Only run once on mount

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    const prefs = getUserPreferences(updatedUser);
    applyTheme(prefs.theme, prefs.accentColor);
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      setUser(null);
      applyTheme('dark', 'teal');
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const loginUser = (loggedInUser) => {
    setUser(loggedInUser);
    const prefs = getUserPreferences(loggedInUser);
    applyTheme(prefs.theme, prefs.accentColor);
    navigate('/');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, handleLogout, handleUserUpdate }}>
      <Outlet />
    </AuthContext.Provider>
  );
}
