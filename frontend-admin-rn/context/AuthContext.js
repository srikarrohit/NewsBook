import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { apiPost } from '../constants/apiUtil';
import { normalizeRole } from '../constants/roleUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser({ ...parsed, role: normalizeRole(parsed.role) });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const saveUser = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Failed to save user:', error);
      }
    };
    if (!isLoading) saveUser();
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
      await AsyncStorage.setItem('user', JSON.stringify(normalizedRes));
      return normalizedRes;
    } catch (e) {
      throw e;
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
