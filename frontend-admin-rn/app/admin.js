import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { normalizeRole } from '../constants/roleUtils';

export default function Admin() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const role = normalizeRole(user?.role);
      const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';
      if (isSuperAdmin) {
        router.replace('/superadmin');
      } else if (role === 'admin' && user?.tileId) {
        router.replace(`/admin/${user.tileId}`);
      } else if (!user) {
        router.replace('/login');
      } else {
        router.replace('/');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f2a45" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
  },
});
