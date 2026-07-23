// post/[tileId].js (moved from post.js for dynamic routing)
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiUploadImage } from '../../constants/apiUploadImage';
import { API_BASE_URL } from '../../constants/api';
import { useAds } from '../../context/AdsContext';
import { useAuth } from '../../context/AuthContext';
import { useTiles } from '../../context/TileContext';
import { normalizeRole } from '../../constants/roleUtils';

const BACKEND_URL = API_BASE_URL; // central API base URL
const TAG_OPTIONS = ['General', 'Politics', 'Sports', 'Business', 'Entertainment', 'Technology'];

export default function PostPage() {
  let { tileId } = useLocalSearchParams();
  const router = useRouter();

  // Validate tileId
  if (!tileId) {
    return <Text>Error: Tile ID is missing</Text>;
  }

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addPost, getPostsByTile } = useTiles();
  const { addAd, getAdsByTile } = useAds();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showPosts, setShowPosts] = useState(false);
  const [dismissedPostIds, setDismissedPostIds] = useState([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isAdMode, setIsAdMode] = useState(false);
  const [adContent, setAdContent] = useState('');
  const [selectedComposerTag, setSelectedComposerTag] = useState(TAG_OPTIONS[0]);
  const [currentAdId, setCurrentAdId] = useState(null);
  const [chargeTimer, setChargeTimer] = useState(null);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedHeight, setFeedHeight] = useState(Dimensions.get('window').height);

  // Validate admin is assigned to this specific tile
  useEffect(() => {
    const role = normalizeRole(user?.role);
    if (role === 'admin' && Number(user?.tileId) !== Number(tileId)) {
      alert('You can only manage your assigned tile');
      router.replace('/');
    }
  }, [user, tileId, router]);

  // Fetch posts and ads for this tile
  useEffect(() => {
    if (tileId) {
      setLoading(true);
      Promise.all([
        getPostsByTile(tileId),
        getAdsByTile(tileId)
      ])
        .then(([postsRes, adsRes]) => {
          setPosts(postsRes);
          setAds(adsRes);
        })
        .catch((err) => {
          Alert.alert('Posts Fetch Error', err.message || JSON.stringify(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tileId]);

  // Cleanup charge timer on unmount
  useEffect(() => {
    return () => {
      if (chargeTimer) clearTimeout(chargeTimer);
    };
  }, [chargeTimer]);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  // Modified handlePost to upload image before creating post/ad
  const handlePost = async () => {
    if (!selectedImage) return Alert.alert('Error', 'Select an image');
    setLoading(true);
    try {
      // Upload image first
      let imageUrl = selectedImage;
      if (!selectedImage.startsWith('http://') && !selectedImage.startsWith('https://') && !selectedImage.startsWith('/images/')) {
        const uploadRes = await apiUploadImage(selectedImage);
        imageUrl = typeof uploadRes === 'string' ? uploadRes : uploadRes.imageUrl || uploadRes.url || uploadRes.path;
      }
      if (isAdMode) {
        if (!adContent.trim()) return Alert.alert('Error', 'Enter ad content');
        await addAd(tileId, user.id, {
          content: adContent,
          image: imageUrl,
          tag: 'tag ad',
        });
        setAdContent('');
        setSelectedImage(null);
        Alert.alert('Success', 'Ad created successfully');
        setAds(await getAdsByTile(tileId));
      } else {
        if (!content.trim()) return Alert.alert('Error', 'Enter content');
        await addPost(tileId, user.id, {
          content,
          image: imageUrl,
          tag: selectedComposerTag,
        });
        setContent('');
        setSelectedImage(null);
        Alert.alert('Success', 'Post created successfully');
        setPosts(await getPostsByTile(tileId));
      }
    } catch (error) {
      Alert.alert('Image Upload Error', error.message || JSON.stringify(error));
      Alert.alert('Error', 'Failed to create post/ad: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const swipeStartX = useRef({});
  const flatListRef = useRef(null);

  const LEGACY_TAGS = ['tag news', 'tag ad'];
  const availableTags = ['All', ...TAG_OPTIONS];
  const filteredPosts = selectedTagFilter === 'All' ? posts : posts.filter((p) => p.tag === selectedTagFilter);
  const getDisplayTag = (item, isAd) => {
    if (isAd) return 'AD';
    if (item.tag && !LEGACY_TAGS.includes(item.tag)) return item.tag;
    return null;
  };

  // Mix posts and ads together (one ad for every 2-3 posts)
  const mixedFeed = (() => {
    const mixed = [];
    const postCount = filteredPosts.length;
    const adCount = ads.length;
    const posts = filteredPosts;
    if (postCount === 0) return ads;
    if (adCount === 0) return posts;
    const adsPerPost = Math.max(1, Math.floor(postCount / (adCount + 1)));
    let postIndex = 0;
    let adIndex = 0;
    let postCounter = 0;
    while (postIndex < postCount || adIndex < adCount) {
      if (postCounter < adsPerPost && postIndex < postCount) {
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
  const visiblePosts = mixedFeed.filter(post => !dismissedPostIds.includes(post.id));
  const handleSwipeLeft = (postId) => {
    if (chargeTimer) clearTimeout(chargeTimer);
    setCurrentAdId(null);
    const newDismissedIds = [...dismissedPostIds, postId];
    setDismissedPostIds(newDismissedIds);
    const remainingItems = mixedFeed.filter(post => !newDismissedIds.includes(post.id));
    if (currentPostIndex < remainingItems.length - 1) {
      const nextIndex = currentPostIndex + 1;
      setTimeout(() => {
        setCurrentPostIndex(nextIndex);
        if (nextIndex < remainingItems.length) {
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }
      }, 100);
    } else if (remainingItems.length > 0) {
      const lastIndex = remainingItems.length - 1;
      setTimeout(() => {
        setCurrentPostIndex(lastIndex);
        flatListRef.current?.scrollToIndex({ index: lastIndex, animated: true });
      }, 100);
    }
  };
  const handleSwipeRight = () => {
    if (chargeTimer) clearTimeout(chargeTimer);
    setCurrentAdId(null);
    if (currentPostIndex > 0) {
      const prevIndex = currentPostIndex - 1;
      setTimeout(() => {
        setCurrentPostIndex(prevIndex);
        if (prevIndex < visiblePosts.length) {
          flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
        }
      }, 100);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      {/* Admin Posting Section */}
      {user && normalizeRole(user.role) === 'admin' && Number(user.tileId) === Number(tileId) && (
        <ScrollView style={{ padding: 15, backgroundColor: '#f9f9f9' }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Toggle Post vs Ad */}
          <View style={{ flexDirection: 'row', marginBottom: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' }}>
            <TouchableOpacity
              style={[styles.toggleBtn, isAdMode ? {} : { backgroundColor: '#333' }]}
              onPress={() => setIsAdMode(false)}
            >
              <Text style={{ color: isAdMode ? '#333' : '#fff', fontWeight: '600' }}>📰 Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isAdMode ? { backgroundColor: '#FF6B6B' } : {}]}
              onPress={() => setIsAdMode(true)}
            >
              <Text style={{ color: isAdMode ? '#fff' : '#333', fontWeight: '600' }}>📢 Ad</Text>
            </TouchableOpacity>
          </View>

          {/* Tag selector (posts only) */}
          {!isAdMode && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
              {TAG_OPTIONS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.composerTagChip, selectedComposerTag === tag && styles.composerTagChipActive]}
                  onPress={() => setSelectedComposerTag(tag)}
                >
                  <Text style={[styles.composerTagText, selectedComposerTag === tag && styles.composerTagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Content Inputs */}
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#666', marginBottom: 10 }]} onPress={pickImage}>
            <Text style={{ color: '#fff' }}>📸 Upload Image</Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setSelectedImage(null)}>
                <Text style={{ color: '#fff', fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            placeholder={isAdMode ? 'Enter ad content' : 'Enter post content'}
            value={isAdMode ? adContent : content}
            onChangeText={isAdMode ? setAdContent : setContent}
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            multiline
          />

          <TouchableOpacity style={styles.btn} onPress={handlePost}>
            <Text style={{ color: '#fff' }}>{isAdMode ? '📢 Upload Ad' : '📝 Post'}</Text>
          </TouchableOpacity>

          {/* Show Posts Button - Only for admins */}
          {user?.role && normalizeRole(user.role) === 'admin' && (
            <TouchableOpacity style={[styles.btn, { marginTop: 15, backgroundColor: '#0066cc' }]} onPress={() => setShowPosts(!showPosts)}>
              <Text style={{ color: '#fff' }}>{showPosts ? 'Hide Posts' : 'Show Posts'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Posts & Ads Feed - Inshorts Style */}
      {(!(user && normalizeRole(user.role) === 'admin' && Number(user.tileId) === Number(tileId)) || showPosts) && (
        <>
          <TouchableOpacity
            style={[styles.sidebarToggle, { top: insets.top + 16 }]}
            onPress={() => setSidebarOpen((open) => !open)}
          >
            <Text style={styles.sidebarToggleText}>{sidebarOpen ? '✕' : '☰'}</Text>
          </TouchableOpacity>
          {sidebarOpen && (
            <View style={[styles.tagSidebar, { top: insets.top + 64 }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tagSidebarContent}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagSidebarChip, selectedTagFilter === tag && styles.tagSidebarChipActive]}
                    onPress={() => {
                      setSelectedTagFilter(tag);
                      setSidebarOpen(false);
                    }}
                  >
                    <Text style={[styles.tagSidebarText, selectedTagFilter === tag && styles.tagSidebarTextActive]} numberOfLines={1}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {visiblePosts && visiblePosts.length > 0 ? (
            <FlatList
              ref={flatListRef}
              style={styles.feedList}
              onLayout={(e) => setFeedHeight(e.nativeEvent.layout.height)}
              data={visiblePosts}
              keyExtractor={(item) => item.id}
              pagingEnabled
              disableIntervalMomentum
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: feedHeight, offset: feedHeight * index, index })}
              renderItem={({ item }) => {
                const imageUrl = item.image.startsWith('http')
                  ? item.image
                  : `${BACKEND_URL}${item.image}`;
                const isAd = typeof item.views === 'number';
                const displayTag = getDisplayTag(item, isAd);

                return (
                  <View style={[styles.card, { height: feedHeight }]}>
                    <View style={styles.cardImageWrap}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.cardImage}
                        onError={(e) => console.log('Image Load Error:', e.nativeEvent.error)}
                      />
                      {displayTag && (
                        <View style={[styles.tagChip, isAd ? styles.tagChipAd : styles.tagChipNews]}>
                          <Text style={styles.tagChipText}>{displayTag}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardTextWrap}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.cardText}>{item.content}</Text>
                      </ScrollView>
                      <Text style={styles.swipeHint}>Swipe up for next story</Text>
                    </View>
                  </View>
                );
              }}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#999' }}>No posts available</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    minHeight: 60,
  },
  imagePreview: {
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  previewImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginBottom: 5,
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  composerTagChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginRight: 8,
    marginBottom: 8,
  },
  composerTagChipActive: {
    backgroundColor: '#333',
  },
  composerTagText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 13,
  },
  composerTagTextActive: {
    color: '#fff',
  },
  sidebarToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 11,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tagSidebar: {
    position: 'absolute',
    top: 64,
    right: 16,
    zIndex: 10,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tagSidebarContent: {
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  tagSidebarChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.55)',
    marginBottom: 8,
    maxWidth: 96,
  },
  tagSidebarChipActive: {
    backgroundColor: '#0f172a',
  },
  tagSidebarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'right',
  },
  tagSidebarTextActive: {
    color: '#fbbf24',
  },
  feedList: {
    flex: 1,
  },
  card: {
    width: Dimensions.get('window').width,
    backgroundColor: '#fff',
  },
  cardImageWrap: {
    width: '100%',
    height: '50%',
    position: 'relative',
    backgroundColor: '#000',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tagChip: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagChipNews: {
    backgroundColor: '#0f172a',
  },
  tagChipAd: {
    backgroundColor: '#FF6B6B',
  },
  tagChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTextWrap: {
    height: '50%',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  cardText: {
    fontSize: 19,
    lineHeight: 27,
    color: '#111827',
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  swipeHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
});
