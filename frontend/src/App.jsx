import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ChatConsole from './components/ChatConsole';
import { fetchApi } from './lib/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetchApi('/api/auth/me')
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {
        // Not logged in
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      setUser(null);
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
        <ChatConsole user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={setUser} />
      )}
    </>
  );
}

export default App;
