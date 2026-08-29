import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'tracely_session';
const TOKEN_KEY   = 'tracely_token';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

  // login guarda: id, role, nombre, correo, token
  const login = (id, role, nombre, token, correo) => {
    const session = { id, role, nombre, correo };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setUser(session);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
