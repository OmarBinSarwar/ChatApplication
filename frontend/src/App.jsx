import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ChatConsole from './components/ChatConsole';
import { fetchApi } from './lib/api';
import { applyTheme, getUserPreferences } from './lib/theme';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetchApi('/api/auth/me')
      .then(data => {
        if (data.user) {
          setUser(data.user);
          const prefs = getUserPreferences(data.user);
          applyTheme(prefs.theme, prefs.accentColor);
        }
      })
      .catch(() => {
        // Not logged in
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    const prefs = getUserPreferences(updatedUser);
    applyTheme(prefs.theme, prefs.accentColor);
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      setUser(null);
      applyTheme('dark', 'purple');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  return (
    <>
      {user ? (
        <ChatConsole user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      ) : (
        <Login onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          const prefs = getUserPreferences(loggedInUser);
          applyTheme(prefs.theme, prefs.accentColor);
        }} />
      )}
    </>
  );
}

export default App;
