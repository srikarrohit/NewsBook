// app/_layout.js
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdsProvider } from '../context/AdsContext';
import { AuthProvider } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext';
import { TileProvider } from '../context/TileContext';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <AdsProvider>
            <TileProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </TileProvider>
          </AdsProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
