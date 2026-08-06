// app/index.js
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { useTiles } from '../context/TileContext';
import { API_BASE_URL } from '../constants/api';

const formatImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

export default function Home() {
  const { user, logout } = useAuth();
  const { location, hasLoadedLocation } = useLocationContext();
  const { tiles, loading, fetchTiles } = useTiles();
  const router = useRouter();

  useEffect(() => {
    if (!hasLoadedLocation) return;
    if (!location) {
      router.replace('/location');
      return;
    }
    fetchTiles(location.state, location.district);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedLocation, location?.state, location?.district]);

  const sortedTiles = [...tiles].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const handleTilePress = (tileId) => {
    router.push(`/post/${tileId}`);
  };

  if (!hasLoadedLocation || !location) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1f2a45" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.heroContainer}>
        <Text style={styles.heroTitle}>NewsBook</Text>
        <Text style={styles.heroSubtitle}>Beautiful Telugu newspaper discovery.</Text>
        <Text style={styles.heroDescription}>
          Explore curated newspapers in a premium tile gallery.
        </Text>
        <View style={styles.pillRow}>
          <TouchableOpacity style={styles.locationPill} onPress={() => router.push('/location')}>
            <Text style={styles.locationPillText}>📍 {location.district}, {location.state}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationPill} onPress={() => router.push('/contact')}>
            <Text style={styles.locationPillText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && sortedTiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1f2a45" />
        </View>
      ) : sortedTiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No newspapers available in your area yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTiles}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.9} style={styles.tileCard} onPress={() => handleTilePress(item.id)}>
              <Image source={{ uri: formatImageUrl(item.image) }} style={styles.tileImage} resizeMode="contain" />
              <View style={styles.overlay} />
              <View style={styles.tileText}>
                <Text style={styles.tileName}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {user && (
        <TouchableOpacity style={styles.logoutButton} onPress={() => { logout(); router.replace('/login'); }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f3f7ff',
  },
  heroContainer: {
    padding: 24,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#a9b4d8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  heroDescription: {
    color: '#cbd5f1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: '94%',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
  tileCard: {
    width: '47%',
    height: 200,
    margin: 8,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  tileImage: {
    width: '100%',
    height: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  tileText: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  tileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  logoutButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoutText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
});
