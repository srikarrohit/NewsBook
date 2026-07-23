// app/_layout.js
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdsProvider } from '../context/AdsContext';
import { AuthProvider } from '../context/AuthContext';
import { TileProvider } from '../context/TileContext';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AdsProvider>
          <TileProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </TileProvider>
        </AdsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
