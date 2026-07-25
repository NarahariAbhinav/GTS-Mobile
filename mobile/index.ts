import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Register background handler for FCM push notifications when app is closed/killed
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('FCM message handled in background/killed state:', remoteMessage);
});

registerRootComponent(App);
