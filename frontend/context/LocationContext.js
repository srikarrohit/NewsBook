// context/LocationContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const LOCATION_STORAGE_KEY = 'newsbook_location';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(null); // { state, district } | null
  const [hasLoadedLocation, setHasLoadedLocation] = useState(false);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
          setLocationState(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load saved location:', error);
      } finally {
        setHasLoadedLocation(true);
      }
    };
    loadLocation();
  }, []);

  const setLocation = async (state, district) => {
    const next = { state, district };
    setLocationState(next);
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };

  const clearLocation = async () => {
    setLocationState(null);
    try {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear location:', error);
    }
  };

  return (
    <LocationContext.Provider value={{ location, hasLoadedLocation, setLocation, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocationContext must be used inside LocationProvider');
  return context;
}
