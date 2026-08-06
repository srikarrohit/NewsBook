// app/contact.js
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CONTACT = {
  name: 'Srikar Pothumahanti',
  phone: '+91 78421 51195',
  phoneHref: 'tel:+917842151195',
  email: 'srikarrohit@gmail.com',
  address: 'S-4, SVS Residency, Angati Dibba, Maharanipeta, Visakhapatnam, 530002',
};

export default function Contact() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'←'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.subtitle}>
          Have a question, feedback, or need help with NewsBook? Reach out using any of the
          details below.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{CONTACT.name}</Text>
          </View>

          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(CONTACT.phoneHref)}>
            <Text style={styles.label}>Phone</Text>
            <Text style={[styles.value, styles.link]}>{CONTACT.phone}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}>
            <Text style={styles.label}>Email</Text>
            <Text style={[styles.value, styles.link]}>{CONTACT.email}</Text>
          </TouchableOpacity>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{CONTACT.address}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f7ff' },
  scroll: { padding: 24, paddingBottom: 48 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#2a5be0', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#475569', lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e1e6ef', padding: 20 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eef2f8' },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 },
  value: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  link: { color: '#2a5be0' },
});
