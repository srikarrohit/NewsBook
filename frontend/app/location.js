import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationSelect from '../components/LocationSelect';
import { useLocationContext } from '../context/LocationContext';
import indiaLocations from '../constants/indiaLocations.json';

const STATES = Object.keys(indiaLocations).sort();
const districtsFor = (state) => (state && indiaLocations[state] ? [...indiaLocations[state]].sort() : []);

export default function LocationPicker() {
  const router = useRouter();
  const { location, setLocation } = useLocationContext();

  const [state, setState] = useState(location?.state || '');
  const [district, setDistrict] = useState(location?.district || '');

  const confirm = async () => {
    if (!state || !district) {
      return Alert.alert('Select location', 'Please choose both a state and a district.');
    }
    await setLocation(state, district);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Choose your location</Text>
        <Text style={styles.subheading}>See newspapers published in your state and district.</Text>

        <LocationSelect label="Select state" value={state} options={STATES} onChange={(s) => { setState(s); setDistrict(''); }} />
        <LocationSelect label="Select district" value={district} options={districtsFor(state)} onChange={setDistrict} disabled={!state} />

        <TouchableOpacity style={styles.button} onPress={confirm}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#475569', marginBottom: 24, lineHeight: 21 },
  button: { backgroundColor: '#1d4ed8', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
