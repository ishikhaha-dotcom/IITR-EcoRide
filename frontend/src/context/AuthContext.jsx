// ─── AuthContext.jsx ──────────────────────────────────────────────────
// Manages the authenticated user state across the app.
// Persists token + user profile in localStorage.
// ─────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('crToken'));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('crUser')); }
    catch { return null; }
  });

  function login(newToken, newUser) {
    localStorage.setItem('crToken', newToken);
    localStorage.setItem('crUser', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('crToken');
    localStorage.removeItem('crUser');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
