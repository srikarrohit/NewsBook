// UserContext for NewsBook frontend (API-based)
import { createContext, useContext, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../constants/apiUtil';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await apiPost('/users/login', { username, password });
      setUser(res);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const getUserById = async (id) => {
    setLoading(true);
    try {
      return await apiGet(`/users/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUserTile = async (id, tileId) => {
    setLoading(true);
    try {
      return await apiPut(`/users/${id}/tile/${tileId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, login, getUserById, updateUserTile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used inside UserProvider');
  return context;
}
