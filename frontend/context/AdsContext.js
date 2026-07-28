// context/AdsContext.js
import { createContext, useContext, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../constants/apiUtil';

const AdsContext = createContext(null);

export function AdsProvider({ children }) {
  const [loading, setLoading] = useState(false);

  const addAd = async (tileId, adminId, adData) => {
    setLoading(true);
    try {
      // adData: { content, image }
      return await apiPost('/ads', { tileId, adminId, ...adData });
    } finally {
      setLoading(false);
    }
  };

  const updateAd = async (adId, adminId, adData) => {
    setLoading(true);
    try {
      // adData: { content, image }
      return await apiPut(`/ads/${adId}`, { adminId, ...adData });
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

  const getAdsByAdmin = async (adminId) => {
    setLoading(true);
    try {
      return await apiGet(`/ads/admin/${adminId}`);
    } finally {
      setLoading(false);
    }
  };

  const trackAdView = async (adId) => {
    try {
      await apiPost(`/ads/${adId}/view`, {});
    } catch (error) {
      console.warn('Failed to track ad view:', error);
    }
  };

  const trackAdClick = async (adId) => {
    try {
      await apiPost(`/ads/${adId}/click`, {});
    } catch (error) {
      console.warn('Failed to track ad click:', error);
    }
  };

  const trackAdDismissal = async (adId) => {
    try {
      await apiPost(`/ads/${adId}/dismissal`, {});
    } catch (error) {
      console.warn('Failed to track ad dismissal:', error);
    }
  };

  const trackAdCharge = async (adId) => {
    try {
      await apiPost(`/ads/${adId}/charge`, {});
    } catch (error) {
      console.warn('Failed to track ad charge:', error);
    }
  };

  return (
    <AdsContext.Provider
      value={{
        loading,
        addAd,
        updateAd,
        getAdsByTile,
        getAdsByAdmin,
        trackAdView,
        trackAdClick,
        trackAdDismissal,
        trackAdCharge,
      }}
    >
      {children}
    </AdsContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdsContext);
  if (!context) throw new Error('useAds must be used inside AdsProvider');
  return context;
}
