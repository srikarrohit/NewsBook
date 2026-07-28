import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAds } from '../../context/AdsContext';
import { useTiles } from '../../context/TileContext';
import { normalizeRole } from '../../constants/roleUtils';

const LEGACY_TAGS = ['tag news', 'tag ad'];
const displayTag = (tag) => (tag && !LEGACY_TAGS.includes(tag) ? tag : 'General');

export default function AdminTilePage() {
  const { user, logout, isLoading } = useAuth();
  const { getTileById, getPostsByTile, getArchivedPostsByTile, hasFetchedOnce, fetchTiles } = useTiles();
  const { getAdsByTile, getArchivedAdsByTile } = useAds();
  const { tileId } = useLocalSearchParams();
  const router = useRouter();

  const [tile, setTile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [archivedAds, setArchivedAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retriedTileFetch, setRetriedTileFetch] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && user) {
      const role = normalizeRole(user.role);
      const isAdmin = role === 'admin';
      if (!isAdmin || Number(user.tileId) !== Number(tileId)) {
        router.replace('/');
      }
    }
  }, [isLoading, router, tileId, user]);

  useEffect(() => {
    if (!tileId) return;
    const selected = getTileById(Number(tileId));
    setTile(selected || null);
  }, [getTileById, tileId]);

  useEffect(() => {
    // Tiles have finished their first load and this admin's assigned tile
    // can't be found. This can be a genuinely stale session (tile deleted),
    // but it can also mean the app's one-time tile fetch on launch raced a
    // backend restart/network blip and came back empty. Retry once before
    // concluding the session is stale and logging out.
    if (!isLoading && hasFetchedOnce && user && !tile) {
      if (!retriedTileFetch) {
        setRetriedTileFetch(true);
        fetchTiles();
      } else {
        logout();
        router.replace('/login');
      }
    }
  }, [isLoading, hasFetchedOnce, user, tile, retriedTileFetch, fetchTiles, logout, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tileId])
  );

  const loadData = async () => {
    if (!tileId) return;
    setLoading(true);
    try {
      const [postData, adData, archivedPostData, archivedAdData] = await Promise.all([
        getPostsByTile(tileId),
        getAdsByTile(tileId),
        getArchivedPostsByTile(tileId),
        getArchivedAdsByTile(tileId),
      ]);
      setPosts(postData || []);
      setAds(adData || []);
      setArchivedPosts(archivedPostData || []);
      setArchivedAds(archivedAdData || []);
    } catch (error) {
      Alert.alert('Unable to load admin data', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const overallCTR = totalViews ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

  const archivedTotalViews = archivedAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const archivedTotalClicks = archivedAds.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
  const archivedOverallCTR = archivedTotalViews ? ((archivedTotalClicks / archivedTotalViews) * 100).toFixed(2) : '0.00';

  const calculateCTR = (ad) => (ad.views ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00');
  const calculateDismissalRate = (ad) => (ad.views ? ((ad.dismissals / ad.views) * 100).toFixed(2) : '0.00');

  const summaryCards = [
    { label: 'Posts', value: posts.length },
    { label: 'Ads', value: ads.length },
    { label: 'Tile ID', value: tileId },
  ];

  if (isLoading || !tile) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1f2a45" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: tile.uri }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroText}>          
          <Text style={styles.heroTitle}>{tile.name}</Text>
          <Text style={styles.heroSubtitle}>Dedicated admin page for your newspaper.</Text>
        </View>
      </View>

      <View style={styles.row}> 
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.statCard}>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.segment}>
        <Text style={styles.sectionTitle}>Create Content</Text>
        <Text style={styles.emptyText}>Write a post or ad on its own page, with a live preview before you publish.</Text>
        <TouchableOpacity style={styles.submitButton} onPress={() => router.push(`/compose/${tileId}`)}>
          <Text style={styles.submitText}>Write a Post</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segment}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        {posts.length === 0 ? (
          <Text style={styles.emptyText}>No posts created yet.</Text>
        ) : (
          posts.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{displayTag(item.tag)}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/compose/${tileId}?editType=post&editId=${item.id}`)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.segment}>
        <Text style={styles.sectionTitle}>Ad Analytics</Text>
        {ads.length === 0 ? (
          <Text style={styles.emptyText}>No ads created yet.</Text>
        ) : (
          <>
            <View style={styles.analyticsSummaryRow}>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>Total Views</Text>
                <Text style={styles.analyticsSummaryValue}>{totalViews}</Text>
              </View>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>Total Clicks</Text>
                <Text style={styles.analyticsSummaryValue}>{totalClicks}</Text>
              </View>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>CTR</Text>
                <Text style={styles.analyticsSummaryValue}>{overallCTR}%</Text>
              </View>
            </View>
            {ads.map((item) => (
              <View key={item.id} style={[styles.card, styles.adCard]}>
                <Text style={styles.cardTitle}>Ad</Text>
                <Text style={styles.cardContent}>{item.content}</Text>
                <View style={styles.adStatsGrid}>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Views</Text>
                    <Text style={styles.adStatValue}>{item.views || 0}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Clicks</Text>
                    <Text style={styles.adStatValue}>{item.clicks || 0}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>CTR %</Text>
                    <Text style={styles.adStatValue}>{calculateCTR(item)}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Dismissals</Text>
                    <Text style={styles.adStatValue}>{item.dismissals || 0}</Text>
                  </View>
                </View>
                <Text style={styles.dismissalRateText}>Dismissal Rate: {calculateDismissalRate(item)}%</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/compose/${tileId}?editType=ad&editId=${item.id}`)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.segment}>
        <Text style={styles.sectionTitle}>Archived News</Text>
        {archivedPosts.length === 0 ? (
          <Text style={styles.emptyText}>No archived posts yet.</Text>
        ) : (
          archivedPosts.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{displayTag(item.tag)}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.segment}>
        <Text style={styles.sectionTitle}>Archived Ads</Text>
        {archivedAds.length === 0 ? (
          <Text style={styles.emptyText}>No archived ads yet.</Text>
        ) : (
          <>
            <View style={styles.analyticsSummaryRow}>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>Total Views</Text>
                <Text style={styles.analyticsSummaryValue}>{archivedTotalViews}</Text>
              </View>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>Total Clicks</Text>
                <Text style={styles.analyticsSummaryValue}>{archivedTotalClicks}</Text>
              </View>
              <View style={styles.analyticsSummaryCard}>
                <Text style={styles.analyticsSummaryLabel}>CTR</Text>
                <Text style={styles.analyticsSummaryValue}>{archivedOverallCTR}%</Text>
              </View>
            </View>
            {archivedAds.map((item) => (
              <View key={item.id} style={[styles.card, styles.adCard]}>
                <Text style={styles.cardTitle}>Ad</Text>
                <Text style={styles.cardContent}>{item.content}</Text>
                <View style={styles.adStatsGrid}>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Views</Text>
                    <Text style={styles.adStatValue}>{item.views || 0}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Clicks</Text>
                    <Text style={styles.adStatValue}>{item.clicks || 0}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>CTR %</Text>
                    <Text style={styles.adStatValue}>{calculateCTR(item)}</Text>
                  </View>
                  <View style={styles.adStatBox}>
                    <Text style={styles.adStatLabel}>Dismissals</Text>
                    <Text style={styles.adStatValue}>{item.dismissals || 0}</Text>
                  </View>
                </View>
                <Text style={styles.dismissalRateText}>Dismissal Rate: {calculateDismissalRate(item)}%</Text>
              </View>
            ))}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => { logout(); router.replace('/login'); }}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3f7ff',
  },
  content: {
    paddingBottom: 32,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f7ff',
  },
  hero: {
    height: 240,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  heroText: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#cbd5f1',
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },
  segment: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    marginRight: 10,
  },
  modeButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  modeText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
  },
  card: {
    marginBottom: 16,
    padding: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fbbf24',
  },
  analyticsSummaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  analyticsSummaryCard: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
  },
  analyticsSummaryLabel: {
    color: '#dbeafe',
    fontSize: 11,
  },
  analyticsSummaryValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  adStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  adStatBox: {
    minWidth: '18%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  adStatLabel: {
    fontSize: 11,
    color: '#92400e',
  },
  adStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  dismissalRateText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '700',
    marginTop: 4,
  },
  cardTitle: {
    color: '#0f172a',
    fontWeight: '800',
    marginBottom: 8,
  },
  cardContent: {
    color: '#475569',
    lineHeight: 20,
  },
  editButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0f6d68',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  logoutButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
});
