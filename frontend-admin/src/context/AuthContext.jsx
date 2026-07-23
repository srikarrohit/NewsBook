import { createContext, useContext, useEffect, useState } from 'react';
import { apiPost } from '../constants/apiUtil';
import { normalizeRole } from '../constants/roleUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser({ ...parsed, role: normalizeRole(parsed.role) });
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user, isLoading]);

  const normalizedUser = user ? { ...user, role: normalizeRole(user.role) } : null;

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const res = await apiPost('/users/login', { username, password });
      const normalizedRes = { ...res, role: normalizeRole(res.role) };
      if (
        normalizedRes.role !== 'super_admin' &&
        normalizedRes.username?.toString().trim().toLowerCase() === 'superadmin'
      ) {
        normalizedRes.role = 'super_admin';
      }
      setUser(normalizedRes);
      localStorage.setItem('user', JSON.stringify(normalizedRes));
      return normalizedRes;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user: normalizedUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
