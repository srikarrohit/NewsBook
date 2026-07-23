import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTiles } from '../../context/TileContext';
import { useAds } from '../../context/AdsContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../constants/roleUtils';

import { API_BASE_URL } from '../../constants/api';
const BACKEND_URL = API_BASE_URL;

export default function PostsPage() {
  const router = useRouter();
  const { tileId } = useLocalSearchParams();
  const { getPostsByTile } = useTiles();
  const { getAdsByTile } = useAds();
  const { user, isLoading: userLoading } = useAuth ? useAuth() : { user: null, isLoading: false };
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep track of which ads have already been viewed in this session
  const [viewedAdIds, setViewedAdIds] = useState(new Set());

  // FlatList viewability config and callback
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = React.useRef(({ viewableItems }) => {
    viewableItems.forEach(({ item }) => {
      if (typeof item.views === 'number' && !viewedAdIds.has(item.id) && normalizeRole(user?.role) !== 'admin') {
        console.log('Tracking ad view for item:', item, 'Current user:', user);
        trackAdView(item.id);
        setViewedAdIds(prev => new Set(prev).add(item.id));
      }
    });
  });

  useEffect(() => {
    if (!tileId) {
      setError('Tile ID is missing');
      return;
    }

    fetchPostsAndAds();
  }, [tileId]);

  const fetchPostsAndAds = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching posts for tileId:', tileId);
      
      const [postsRes, adsRes] = await Promise.all([
        getPostsByTile(tileId),
        getAdsByTile(tileId),
      ]);

      console.log('Posts:', postsRes);
      console.log('Ads:', adsRes);

      // Ensure image URLs are absolute
      const processedPosts = (postsRes || []).map(post => ({
        ...post,
        image: post.image ? formatImageUrl(post.image) : null,
      }));

      const processedAds = (adsRes || []).map(ad => ({
        ...ad,
        image: ad.image ? formatImageUrl(ad.image) : null,
      }));

      setPosts(processedPosts);
      setAds(processedAds);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to fetch posts');
      Alert.alert('Error', 'Failed to fetch posts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it starts with /images, prepend the backend URL
    if (imageUrl.startsWith('/images')) {
      return `${BACKEND_URL}${imageUrl}`;
    }
    
    // Otherwise prepend /images and backend URL
    return `${BACKEND_URL}/images/${imageUrl}`;
  };

  // Track ad view when an ad is displayed
  const trackAdView = async (adId) => {
    try {
      console.log('Tracking ad view for adId:', adId);
      Alert.alert('Tracking ad view', 'Ad ID: ' + adId);
      const res = await fetch(`${BACKEND_URL}/ads/${adId}/view`, { method: 'POST' });
      console.log('Backend response status:', res.status);
      const text = await res.text();
      console.log('Backend response for ad view:', text);
      if (!res.ok) {
        Alert.alert('Error', 'Failed to track view: ' + text);
      } else {
        Alert.alert('Success', 'View tracked');
      }
    } catch (e) {
      console.warn('Failed to track ad view', e);
      Alert.alert('Error', 'Failed to track view: ' + e.message);
    }
  };

  const mixedFeed = (() => {
    const mixed = [];
    const postCount = posts.length;
    const adCount = ads.length;
    if (postCount === 0) return ads;
    if (adCount === 0) return posts;

    const postsPerAd = 5; // Show an ad for every 5 posts
    let postIndex = 0;
    let adIndex = 0;
    let postCounter = 0;

    while (postIndex < postCount || adIndex < adCount) {
      if (postCounter < postsPerAd && postIndex < postCount) {
        mixed.push(posts[postIndex]);
        postIndex++;
        postCounter++;
      } else if (adIndex < adCount) {
        mixed.push(ads[adIndex]);
        adIndex++;
        postCounter = 0;
      } else if (postIndex < postCount) {
        mixed.push(posts[postIndex]);
        postIndex++;
      }
    }

    return mixed;
  })();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      )}

      {!loading && mixedFeed.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts available</Text>
        </View>
      )}

      {!userLoading && !loading && mixedFeed.length > 0 && (
        <FlatList
          data={mixedFeed}
          keyExtractor={(item, idx) => `${item.views !== undefined ? 'ad' : 'post'}-${item.id}`}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <Text style={styles.postContent}>{item.content}</Text>
              {item.image && (
                <Image
                  source={{ uri: item.image }}
                  style={styles.postImage}
                  resizeMode="cover"
                  onError={(error) => console.log('Image load error:', error)}
                />
              )}
              {typeof item.views === 'number' && normalizeRole(user?.role) !== 'admin' && (
                <TouchableOpacity 
                  style={styles.trackButton}
                  onPress={() => trackAdView(item.id)}
                >
                  <Text style={styles.trackButtonText}>Track View</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#ffcccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  postContainer: {
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  postContent: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  trackButton: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  trackButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});