import { createContext, useContext, useState } from 'react';
import { apiGet, apiPost } from '../constants/apiUtil';

const AdsContext = createContext(null);

export function AdsProvider({ children }) {
  const [loading, setLoading] = useState(false);

  const addAd = async (tileId, adminId, adData) => {
    setLoading(true);
    try {
      return await apiPost('/ads', { tileId, adminId, ...adData });
    } finally {
      setLoading(false);
    }
  };

  const getAdsByTile = async (tileId) => {
    setLoading(true);
    try {
      return await apiGet(`/ads/tile/${tileId}`);
    } finally {
      setLoading(false);
    }
  };

  const getArchivedAdsByTile = async (tileId) => {
    setLoading(true);
    try {
      return await apiGet(`/ads/tile/${tileId}/archived`);
    } finally {
      setLoading(false);
    }
  };

  const getAdsByAdmin = async (adminId) => {
    setLoading(true);
    try {
      return await apiGet(`/ads/admin/${adminId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdsContext.Provider value={{ loading, addAd, getAdsByTile, getArchivedAdsByTile, getAdsByAdmin }}>
      {children}
    </AdsContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdsContext);
  if (!context) throw new Error('useAds must be used inside AdsProvider');
  return context;
}
