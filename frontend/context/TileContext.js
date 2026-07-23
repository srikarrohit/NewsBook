// context/TileContext.js
import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../constants/apiUtil';

const TileContext = createContext(null);

export function TileProvider({ children }) {
  const [tiles, setTiles] = useState([]); // Array of tile objects from backend
  const [loading, setLoading] = useState(false);

  const fetchTiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/tiles');
      setTiles(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all tiles on mount
  useEffect(() => {
    fetchTiles();
  }, [fetchTiles]);

  const getTileById = (tileId) => tiles.find((t) => t.id === Number(tileId));

  const createTile = async (tileDTO) => {
    setLoading(true);
    try {
      const created = await apiPost('/tiles', tileDTO);
      setTiles((prev) => [...prev, created]);
      return created;
    } finally {
      setLoading(false);
    }
  };

  const updateTile = async (id, tileDTO) => {
    setLoading(true);
    try {
      const updated = await apiPut(`/tiles/${id}`, tileDTO);
      setTiles((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const deleteTile = async (id) => {
    setLoading(true);
    try {
      await apiDelete(`/tiles/${id}`);
      setTiles((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setLoading(false);
    }
  };

  // Posts
  const getPostsByTile = async (tileId) => {
    setLoading(true);
    try {
      return await apiGet(`/posts/tile/${tileId}`);
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (tileId, adminId, post) => {
    setLoading(true);
    try {
      // post: { content, image }
      return await apiPost('/posts', { tileId, adminId, ...post });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TileContext.Provider value={{ tiles, loading, fetchTiles, getTileById, createTile, updateTile, deleteTile, getPostsByTile, addPost }}>
      {children}
    </TileContext.Provider>
  );
}

export function useTiles() {
  const context = useContext(TileContext);
  if (!context) throw new Error('useTiles must be used inside TileProvider');
  return context;
}
