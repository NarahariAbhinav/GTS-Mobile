// Firebase Web SDK configuration for the mobile app
import { initializeApp, getApps } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDfVrBhU2s_vbPgUBZwsJiPrreX2X16peg",
    authDomain: "garment-tracker-b9473.firebaseapp.com",
    projectId: "garment-tracker-b9473",
    storageBucket: "garment-tracker-b9473.firebasestorage.app",
    messagingSenderId: "163192454816",
    appId: "1:163192454816:web:4f6f5c52d3b5a703c153c5"
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
