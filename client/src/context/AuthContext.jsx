import React, { createContext, useState, useEffect } from 'react';
import { DEMO_MODE, DEMO_TOKEN, DEMO_USER } from '../demo/demoMode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token and user data on initial app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else if (DEMO_MODE) {
      // No backend to authenticate against: start already signed in so the
      // protected board routes are reachable during the presentation.
      setToken(DEMO_TOKEN);
      setUser(DEMO_USER);
    }
    setLoading(false);
  }, []);

  // Save token and user details upon successful login/register
  const loginSession = (userToken, userData) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  // Clear session on logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};