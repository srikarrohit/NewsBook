import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { TileProvider } from '../context/TileContext';
import { AdsProvider } from '../context/AdsContext';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TileProvider>
          <AdsProvider>
            <Slot />
          </AdsProvider>
        </TileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
