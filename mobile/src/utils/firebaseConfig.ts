// Firebase Web SDK configuration for the mobile app
import { initializeApp, getApps } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDlEd2FzCbTzuLWQHmV9NRc7hU3OJ_8dFo",
    authDomain: "gtsmobileapp-71337.firebaseapp.com",
    projectId: "gtsmobileapp-71337",
    storageBucket: "gtsmobileapp-71337.firebasestorage.app",
    messagingSenderId: "865187866696",
    appId: "1:865187866696:web:6268cdce83b459a59b907d",
    measurementId: "G-L42Y6JJPES"
};

// Initialize Firebase only once (prevent hot-reload issues)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth WITH AsyncStorage persistence so login survives app restarts
let auth: any;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch (e: any) {
    // If auth is already initialized (hot reload), get the existing instance
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
}

export { auth };
export default app;
