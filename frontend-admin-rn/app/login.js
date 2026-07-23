// app/login.js
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../constants/roleUtils';

export default function Login() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      const role = normalizeRole(user.role);
      const isSuperAdmin = role === 'super_admin' || user.username?.toLowerCase() === 'superadmin';
      if (isSuperAdmin) {
        router.replace('/superadmin');
      } else if (role === 'admin' && user.tileId) {
        router.replace(`/admin/${user.tileId}`);
      } else {
        router.replace('/');
      }
    }
  }, [user, isLoading, router]);

  const handleLogin = async () => {
    try {
      const res = await login(username, password);
      setUsername('');
      setPassword('');
      Alert.alert('Welcome', `Hello ${res.username}`);
    } catch (e) {
      Alert.alert('Login failed', e.message || 'Invalid credentials');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking credentials...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to view your dedicated newspapers and manage content.</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f7fb' },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 10, color: '#1f2a45' },
  subtitle: { fontSize: 16, color: '#56627a', marginBottom: 24, lineHeight: 22 },
  input: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e1e6ef' },
  btn: { backgroundColor: '#1f2a45', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loadingText: { fontSize: 16, color: '#56627a' },
});
