import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAds } from '../../context/AdsContext';
import { useTiles } from '../../context/TileContext';
import { apiGet, apiPut } from '../../constants/apiUtil';
import { API_BASE_URL } from '../../constants/api';
import { apiUploadImage } from '../../constants/apiUploadImage';
import { normalizeRole } from '../../constants/roleUtils';
import { IMAGE_ASPECT, IMAGE_ASPECT_RATIO } from '../../constants/imageAspect';

const TAG_OPTIONS = ['General', 'Politics', 'Sports', 'Business', 'Entertainment', 'Technology'];
const MAX_WORDS = 80;
const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const formatImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
};

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const { addPost } = useTiles();
  const { addAd } = useAds();
  const { tileId, editType: editTypeParam, editId } = useLocalSearchParams();
  const router = useRouter();

  const editType = editTypeParam === 'ad' ? 'ad' : editTypeParam === 'post' ? 'post' : null;
  const isEditing = Boolean(editType && editId);

  const [selectedMode, setSelectedMode] = useState(editType === 'ad' ? 'ad' : 'post');
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0]);
  const [content, setContent] = useState('');
  const [adContent, setAdContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const role = normalizeRole(user?.role);
      if (!user || role !== 'admin' || Number(user.tileId) !== Number(tileId)) {
        router.replace('/');
      }
    }
  }, [isLoading, router, tileId, user]);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const data = await apiGet(editType === 'ad' ? `/ads/${editId}` : `/posts/${editId}`);
        if (editType === 'ad') {
          setAdContent(data.content || '');
        } else {
          setContent(data.content || '');
          setSelectedTag(TAG_OPTIONS.includes(data.tag) ? data.tag : TAG_OPTIONS[0]);
        }
        setExistingImageUrl(data.image || null);
      } catch (error) {
        Alert.alert('Unable to load', error.message || 'Try again');
      }
    })();
  }, [isEditing, editType, editId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: IMAGE_ASPECT,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    }
  };

  const activeText = selectedMode === 'post' ? content : adContent;
  const setActiveText = selectedMode === 'post' ? setContent : setAdContent;
  const wordCount = countWords(activeText);
  const overWordLimit = wordCount > MAX_WORDS;

  const handlePublish = async () => {
    if (!activeText.trim()) {
      return Alert.alert('Please enter some content');
    }
    if (overWordLimit) {
      return Alert.alert('Too long', `Please keep it to ${MAX_WORDS} words or fewer (currently ${wordCount}).`);
    }
    if (!selectedImage && !(isEditing && existingImageUrl)) {
      return Alert.alert('Please select an image');
    }
    setLoading(true);
    try {
      let imageUrl = existingImageUrl;
      if (selectedImage) {
        const uploadRes = await apiUploadImage(selectedImage);
        imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path;
      }

      if (isEditing) {
        if (editType === 'ad') {
          await apiPut(`/ads/${editId}`, { adminId: user.id, content: adContent, image: imageUrl });
        } else {
          await apiPut(`/posts/${editId}`, { adminId: user.id, content, image: imageUrl, tag: selectedTag });
        }
        Alert.alert('Success', `${editType === 'ad' ? 'Ad' : 'Post'} updated successfully`);
      } else if (selectedMode === 'post') {
        await addPost(tileId, user.id, { content, image: imageUrl, tag: selectedTag });
        Alert.alert('Success', 'Post published successfully');
      } else {
        await addAd(tileId, user.id, { content: adContent, image: imageUrl, tag: 'admin ad' });
        Alert.alert('Success', 'Ad published successfully');
      }
      router.back();
    } catch (error) {
      Alert.alert(isEditing ? 'Save failed' : 'Publish failed', error.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>{isEditing ? `Edit ${selectedMode === 'ad' ? 'Ad' : 'Post'}` : 'Write a Post'}</Text>
        <Text style={styles.subheading}>
          {isEditing ? 'Update the content and see the preview before saving.' : 'Compose your story and see exactly how it will look before publishing.'}
        </Text>

        {!isEditing && (
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, selectedMode === 'post' && styles.modeButtonActive]}
              onPress={() => setSelectedMode('post')}
            >
              <Text style={[styles.modeText, selectedMode === 'post' && styles.modeTextActive]}>Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, selectedMode === 'ad' && styles.modeButtonActive]}
              onPress={() => setSelectedMode('ad')}
            >
              <Text style={[styles.modeText, selectedMode === 'ad' && styles.modeTextActive]}>Ad</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedMode === 'post' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tag</Text>
            <View style={styles.tagRow}>
              {TAG_OPTIONS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagButton, selectedTag === tag && styles.tagButtonActive]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Text style={[styles.tagButtonText, selectedTag === tag && styles.tagButtonTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={loading}>
            <Text style={styles.uploadButtonText}>{selectedImage || existingImageUrl ? 'Change Image' : 'Upload Image'}</Text>
          </TouchableOpacity>
          <TextInput
            placeholder={selectedMode === 'post' ? 'Write your news story...' : 'Write your ad copy...'}
            value={activeText}
            onChangeText={setActiveText}
            style={styles.input}
            multiline
          />
          <Text style={overWordLimit ? styles.wordCountError : styles.wordCountText}>{wordCount} / {MAX_WORDS} words</Text>
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>🎙️ Tip: tap the microphone icon on your keyboard to dictate this text.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewImageWrap}>
              {selectedImage || existingImageUrl ? (
                <Image source={{ uri: selectedImage || formatImageUrl(existingImageUrl) }} style={[styles.previewImage, { aspectRatio: IMAGE_ASPECT_RATIO }]} resizeMode="cover" />
              ) : (
                <View style={[styles.previewImagePlaceholder, { aspectRatio: IMAGE_ASPECT_RATIO }]}>
                  <Text style={styles.previewPlaceholderText}>No image selected</Text>
                </View>
              )}
              <View style={[styles.previewTagChip, selectedMode === 'ad' && styles.previewTagChipAd]}>
                <Text style={styles.previewTagChipText}>{selectedMode === 'post' ? selectedTag : 'AD'}</Text>
              </View>
            </View>
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewText}>
                {activeText.trim() ? activeText : 'Your content will appear here as you type.'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handlePublish} disabled={loading || overWordLimit}>
          <Text style={styles.submitText}>
            {loading
              ? (isEditing ? 'Saving...' : 'Publishing...')
              : isEditing
                ? `Save ${selectedMode === 'ad' ? 'Ad' : 'Post'}`
                : selectedMode === 'post' ? 'Publish Post' : 'Publish Ad'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 24, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backButtonText: { color: '#1d4ed8', fontSize: 15, fontWeight: '700' },
  heading: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#56627a', marginBottom: 20, lineHeight: 21 },
  modeRow: { flexDirection: 'row', marginBottom: 20 },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    marginRight: 10,
  },
  modeButtonActive: { backgroundColor: '#1d4ed8' },
  modeText: { color: '#0f172a', fontWeight: '700' },
  modeTextActive: { color: '#fff' },
  section: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  uploadButton: {
    backgroundColor: '#0f6d68',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlignVertical: 'top',
  },
  wordCountText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  wordCountError: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
  },
  hintBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  hintText: { fontSize: 12, color: '#64748b' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonActive: { backgroundColor: '#1d4ed8' },
  tagButtonText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  tagButtonTextActive: { color: '#fff' },
  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  previewImageWrap: { position: 'relative' },
  previewImage: { width: '100%' },
  previewImagePlaceholder: {
    width: '100%',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: { color: '#94a3b8', fontSize: 14 },
  previewTagChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  previewTagChipAd: { backgroundColor: '#FF6B6B' },
  previewTagChipText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  previewTextContainer: { padding: 18 },
  previewText: {
    fontSize: 16,
    color: '#0f172a',
    lineHeight: 24,
    flexWrap: 'wrap',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
