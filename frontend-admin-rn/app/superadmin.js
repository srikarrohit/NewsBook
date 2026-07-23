import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { apiGet, apiPost } from '../constants/apiUtil';
import { apiUploadImage } from '../constants/apiUploadImage';
import { useTiles } from '../context/TileContext';
import { normalizeRole } from '../constants/roleUtils';

export default function SuperAdminPage() {
  const { user, logout, isLoading } = useAuth();
  const { tiles, fetchTiles } = useTiles();
  const router = useRouter();

  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  const [adminAccountsError, setAdminAccountsError] = useState(null);

  const [newGridName, setNewGridName] = useState('');
  const [selectedGridImage, setSelectedGridImage] = useState(null);
  const [newGridPriority, setNewGridPriority] = useState('1');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [existingTileId, setExistingTileId] = useState('');
  const [existingAdminUsername, setExistingAdminUsername] = useState('');
  const [existingAdminPassword, setExistingAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const role = normalizeRole(user?.role);
      const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';
      if (!isSuperAdmin) {
        router.replace(role === 'admin' && user?.tileId ? `/admin/${user.tileId}` : '/login');
      }
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!isLoading) {
      fetchTiles();
      fetchAdminAccounts();
    }
  }, [isLoading, fetchTiles]);

  const fetchAdminAccounts = async () => {
    setAdminAccountsLoading(true);
    setAdminAccountsError(null);
    try {
      const data = await apiGet(`/admin/list-admins?requestedBy=${encodeURIComponent(user.username)}`);
      setAdminAccounts(data || []);
    } catch (error) {
      setAdminAccountsError(error.message || 'Failed to load admin accounts');
    } finally {
      setAdminAccountsLoading(false);
    }
  };

  const pickGridImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedGridImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    }
  };

  const registerGrid = async () => {
    if (!newGridName.trim() || !newAdminUsername.trim() || !newAdminPassword.trim() || !selectedGridImage) {
      return Alert.alert('Validation', 'Enter a grid name, upload an image, and provide admin credentials.');
    }

    setLoading(true);
    try {
      const uploadRes = await apiUploadImage(selectedGridImage);
      const imageUrl = uploadRes.url || uploadRes.imageUrl || uploadRes.path || selectedGridImage;

      const res = await apiPost('/admin/register', {
        username: newAdminUsername.trim(),
        password: newAdminPassword,
        tileName: newGridName.trim(),
        tileImage: imageUrl,
        priority: Number(newGridPriority) || 0,
        createdBy: user.username,
      });
      const createdTile = Array.isArray(res) && res[1] ? res[1] : res;
      Alert.alert('Grid created', `Grid and admin user created successfully. Tile id: ${createdTile?.id}`);
      setNewGridName('');
      setSelectedGridImage(null);
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewGridPriority('1');
      fetchTiles();
    } catch (error) {
      Alert.alert('Create failed', error.message || 'Unable to create grid.');
    } finally {
      setLoading(false);
    }
  };

  const createAdminForTile = async () => {
    if (!existingTileId.trim() || !existingAdminUsername.trim() || !existingAdminPassword.trim()) {
      return Alert.alert('Validation', 'Enter tile id, username and password.');
    }

    setLoading(true);
    try {
      await apiPost('/admin/create-admin', {
        username: existingAdminUsername.trim(),
        password: existingAdminPassword,
        tileId: Number(existingTileId),
        createdBy: user.username,
      });
      Alert.alert('Admin created', 'New admin user created for the grid.');
      setExistingAdminUsername('');
      setExistingAdminPassword('');
      setExistingTileId('');
    } catch (error) {
      Alert.alert('Create failed', error.message || 'Unable to create admin user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Super Admin Portal</Text>
        <Text style={styles.subheading}>Register newspaper grids and manage admin users for each newspaper.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Register a new grid</Text>
          <TextInput
            style={styles.input}
            placeholder="Grid name"
            value={newGridName}
            onChangeText={setNewGridName}
          />
          <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={pickGridImage} disabled={loading}>
            <Text style={styles.buttonText}>{selectedGridImage ? 'Change Image' : 'Upload Image'}</Text>
          </TouchableOpacity>
          {selectedGridImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedGridImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedGridImage(null)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Priority (lower appears first)"
            value={newGridPriority}
            keyboardType="numeric"
            onChangeText={setNewGridPriority}
          />
          <TextInput
            style={styles.input}
            placeholder="Admin username"
            value={newAdminUsername}
            onChangeText={setNewAdminUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Admin password"
            value={newAdminPassword}
            onChangeText={setNewAdminPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={registerGrid} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Register Grid'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create admin for existing grid</Text>
          <TextInput
            style={styles.input}
            placeholder="Existing tile id"
            value={existingTileId}
            onChangeText={setExistingTileId}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Admin username"
            value={existingAdminUsername}
            onChangeText={setExistingAdminUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Admin password"
            value={existingAdminPassword}
            onChangeText={setExistingAdminPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={createAdminForTile} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Admin'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current newspaper grids</Text>
          {tiles.length === 0 ? (
            <Text style={styles.emptyText}>No grids available yet.</Text>
          ) : (
            tiles.map((tile) => (
              <TouchableOpacity key={tile.id} style={styles.tileCard} onPress={() => router.push(`/grid/${tile.id}`)}>
                <Text style={styles.tileName}>{tile.name}</Text>
                <Text style={styles.tileDetails}>Database ID: {tile.id}</Text>
                <Text style={styles.tileDetails}>Tile ID: {tile.tileId}</Text>
                <Text style={styles.tileDetails}>Priority: {tile.priority ?? 0}</Text>
                <Text style={styles.tileHint}>Tap to view admin account &amp; update</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Admin Accounts</Text>
          {adminAccountsLoading && <Text style={styles.helperText}>Loading admin accounts...</Text>}
          {adminAccountsError && <Text style={styles.errorText}>{adminAccountsError}</Text>}
          {!adminAccountsLoading && adminAccounts.length === 0 ? (
            <Text style={styles.emptyText}>No admin accounts yet.</Text>
          ) : (
            adminAccounts.map((account) => (
              <View key={account.id} style={styles.tileCard}>
                <Text style={styles.tileName}>{account.username}</Text>
                <Text style={styles.tileDetails}>Password: {account.password}</Text>
                <Text style={styles.tileDetails}>Tile ID: {account.tileId ?? '—'}</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => { logout(); router.replace('/login'); }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4ff' },
  content: { padding: 24, paddingBottom: 36 },
  heading: { fontSize: 30, fontWeight: '900', color: '#102a43', marginBottom: 8 },
  subheading: { fontSize: 16, color: '#334e68', marginBottom: 22, lineHeight: 22 },
  section: { marginBottom: 22, padding: 18, borderRadius: 24, backgroundColor: '#fff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#102a43', marginBottom: 12 },
  helperText: { fontSize: 13, color: '#627d98', marginBottom: 12 },
  input: { backgroundColor: '#f0f4ff', borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#d9e2ec' },
  button: { backgroundColor: '#1d4ed8', padding: 16, borderRadius: 16, alignItems: 'center' },
  smallButton: { flex: 1, marginRight: 8 },
  cancelButton: { backgroundColor: '#64748b', flex: 1 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  tileCard: { padding: 16, borderRadius: 20, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#d9e2ec', marginBottom: 12 },
  tileName: { fontSize: 16, fontWeight: '800', color: '#102a43', marginBottom: 4 },
  tileDetails: { fontSize: 14, color: '#334e68' },
  tileHint: { marginTop: 8, fontSize: 13, color: '#64748b' },
  imagePreview: { marginBottom: 12, position: 'relative' },
  previewImage: { width: '100%', height: 180, borderRadius: 16 },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ff5a5f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  uploadButton: { backgroundColor: '#0f6d68', marginBottom: 12 },
  emptyText: { color: '#627d98', fontSize: 15 },
  errorText: { color: '#cc0000', fontSize: 14, marginBottom: 12 },
  logoutButton: { marginTop: 16, alignItems: 'center' },
  logoutText: { color: '#334e68', fontSize: 15, fontWeight: '700' },
});
