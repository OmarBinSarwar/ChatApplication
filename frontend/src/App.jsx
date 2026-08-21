import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import RootLayout from './layouts/RootLayout';
import { useAuth } from './lib/authContext';
import { registerServiceWorker, subscribeToPush } from './lib/pushNotifications';

// Wrapper for ChatPage to supply context props
const ChatPageWrapper = () => {
  const { user, handleLogout, handleUserUpdate } = useAuth();

  useEffect(() => {
    if (user) {
      // Register SW and subscribe to push notifications after login
      registerServiceWorker().then(() => subscribeToPush());
    }
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  return <ChatPage user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
};

// Wrapper for LoginPage to supply context props
const LoginPageWrapper = () => {
  const { user, loginUser } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage onLogin={loginUser} />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ChatPageWrapper />,
      },
      {
        path: 'login',
        element: <LoginPageWrapper />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
