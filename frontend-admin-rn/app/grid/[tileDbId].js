import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTiles } from '../../context/TileContext';
import { apiGet } from '../../constants/apiUtil';
import { apiUploadImage } from '../../constants/apiUploadImage';
import { normalizeRole } from '../../constants/roleUtils';
import LocationSelect from '../../components/LocationSelect';
import indiaLocations from '../../constants/indiaLocations.json';

const STATES = Object.keys(indiaLocations).sort();
const districtsFor = (state) => (state && indiaLocations[state] ? [...indiaLocations[state]].sort() : []);

export default function GridDetailPage() {
  const { user, isLoading } = useAuth();
  const { getTileById, updateTile, fetchTiles } = useTiles();
  const { tileDbId } = useLocalSearchParams();
  const router = useRouter();

  const tile = getTileById(Number(tileDbId));

  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState(null);

  const [gridName, setGridName] = useState('');
  const [gridTileId, setGridTileId] = useState('');
  const [gridPriority, setGridPriority] = useState('0');
  const [gridState, setGridState] = useState('');
  const [gridDistrict, setGridDistrict] = useState('');
  const [gridImageUrl, setGridImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const role = normalizeRole(user?.role);
  const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';

  useEffect(() => {
    if (!isLoading) {
      if (!isSuperAdmin) {
        router.replace(role === 'admin' && user?.tileId ? `/admin/${user.tileId}` : '/login');
      }
    }
  }, [isLoading, router, user, isSuperAdmin, role]);

  useEffect(() => {
    if (!isLoading) {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    if (tile) {
      setGridName(tile.name || '');
      setGridTileId(tile.tileId || '');
      setGridPriority(tile.priority != null ? String(tile.priority) : '0');
      setGridState(tile.state || '');
      setGridDistrict(tile.district || '');
      setGridImageUrl(tile.image || '');
      setSelectedImage(null);
    }
  }, [tile]);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    setAdminsError(null);
    try {
      const data = await apiGet(`/admin/list-admins?requestedBy=${encodeURIComponent(user.username)}`);
      setAdmins((data || []).filter((a) => Number(a.tileId) === Number(tileDbId)));
    } catch (error) {
      setAdminsError(error.message || 'Failed to load admin accounts');
    } finally {
      setAdminsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    }
  };

  const handleUpdate = async () => {
    if (!gridName.trim() || !gridTileId.trim() || !gridPriority.trim()) {
      return Alert.alert('Validation', 'Provide grid id, name, and priority.');
    }

    setLoading(true);
    try {
      let imageUrl = gridImageUrl;
      if (selectedImage) {
        const uploadRes = await apiUploadImage(selectedImage);
        imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path || selectedImage;
      }

      await updateTile(Number(tileDbId), {
        tileId: gridTileId.trim(),
        name: gridName.trim(),
        image: imageUrl,
        priority: Number(gridPriority) || 0,
        state: gridState,
        district: gridDistrict,
      });
      Alert.alert('Grid updated', 'Grid metadata and image updated successfully.');
      await fetchTiles();
      router.back();
    } catch (error) {
      Alert.alert('Update failed', error.message || 'Unable to update grid.');
    } finally {
      setLoading(false);
    }
  };

  if (!tile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <Text style={styles.helperText}>Loading grid...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>{tile.name}</Text>
        <Text style={styles.subheading}>Grid details, admin accounts, and update options.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admins for this grid</Text>
          {adminsLoading && <Text style={styles.helperText}>Loading admin accounts...</Text>}
          {adminsError && <Text style={styles.errorText}>{adminsError}</Text>}
          {!adminsLoading && admins.length === 0 ? (
            <Text style={styles.emptyText}>No admin accounts found for this grid.</Text>
          ) : (
            admins.map((account) => (
              <View key={account.id} style={styles.tileCard}>
                <Text style={styles.tileName}>{account.username}</Text>
                <Text style={styles.tileDetails}>Password: {account.password}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update grid</Text>
          <TextInput
            style={styles.input}
            placeholder="Grid id (tileId)"
            value={gridTileId}
            onChangeText={setGridTileId}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Grid name"
            value={gridName}
            onChangeText={setGridName}
          />
          <LocationSelect
            label="Select state"
            value={gridState}
            options={STATES}
            onChange={(s) => { setGridState(s); setGridDistrict(''); }}
          />
          <LocationSelect
            label="Select district"
            value={gridDistrict}
            options={districtsFor(gridState)}
            onChange={setGridDistrict}
            disabled={!gridState}
          />
          <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={pickImage} disabled={loading}>
            <Text style={styles.buttonText}>{selectedImage ? 'Change Image' : 'Upload New Image'}</Text>
          </TouchableOpacity>
          {selectedImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedImage(null)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : gridImageUrl ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: gridImageUrl }} style={styles.previewImage} resizeMode="contain" />
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Priority (lower appears first)"
            value={gridPriority}
            keyboardType="numeric"
            onChangeText={setGridPriority}
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.button, styles.smallButton]} onPress={handleUpdate} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.back()} disabled={loading}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4ff' },
  content: { padding: 24, paddingBottom: 36 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backButtonText: { color: '#1d4ed8', fontSize: 15, fontWeight: '700' },
  heading: { fontSize: 28, fontWeight: '900', color: '#102a43', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#334e68', marginBottom: 22, lineHeight: 21 },
  section: { marginBottom: 22, padding: 18, borderRadius: 24, backgroundColor: '#fff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#102a43', marginBottom: 12 },
  helperText: { fontSize: 13, color: '#627d98', marginBottom: 12 },
  errorText: { color: '#cc0000', fontSize: 14, marginBottom: 12 },
  input: { backgroundColor: '#f0f4ff', borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#d9e2ec' },
  button: { backgroundColor: '#1d4ed8', padding: 16, borderRadius: 16, alignItems: 'center' },
  smallButton: { flex: 1, marginRight: 8 },
  cancelButton: { backgroundColor: '#64748b', flex: 1 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  tileCard: { padding: 16, borderRadius: 20, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#d9e2ec', marginBottom: 12 },
  tileName: { fontSize: 16, fontWeight: '800', color: '#102a43', marginBottom: 4 },
  tileDetails: { fontSize: 14, color: '#334e68' },
  imagePreview: { marginBottom: 12, position: 'relative' },
  previewImage: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#f0f0f0' },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ff5a5f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  uploadButton: { backgroundColor: '#0f6d68', marginBottom: 12 },
  emptyText: { color: '#627d98', fontSize: 15 },
});
