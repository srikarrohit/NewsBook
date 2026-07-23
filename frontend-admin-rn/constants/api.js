// API base URL for backend
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android emulator, localhost for web/iOS, or override with your LAN IP for real devices
// Current machine LAN IP is 192.168.1.7 — use this so Expo devices on the same network can reach the backend
const API_BASE_URL = 'http://192.168.1.7:8080/api';
export { API_BASE_URL };
