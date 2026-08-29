import React, { createContext, useState, useEffect } from 'react';
import { DEMO_MODE } from '../demo/demoMode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token and user data on initial app load
  useEffect(() => {
    // In demo mode a stored session is deliberately NOT restored, so the login
    // screen always runs before the dashboard (and every reload returns to it).
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
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

  /*
   * Replace the stored account after the user edits it in Settings.
   *
   * The token is untouched: it carries only the user id, so a changed username,
   * email or password does not invalidate it. Written to localStorage as well
   * as state, or a reload would show the pre-edit copy again.
   */
  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
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
    <AuthContext.Provider value={{ user, token, loading, loginSession, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};