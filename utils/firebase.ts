// React Native Firebase configuration
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

// Initialize Firebase with config
const firebaseConfig = {
    apiKey: "AIzaSyCxy8dbYz-aVhCvjXRT7CT6DPyNjL_KDEs",
    authDomain: "klord-energy-9f18e.firebaseapp.com",
    projectId: "klord-energy-9f18e",
    storageBucket: "klord-energy-9f18e.firebasestorage.app",
    messagingSenderId: "201877204290",
    appId: "1:201877204290:android:bc701172d322396cfeacdb"
};

// Initialize Firebase app if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export the auth instance
export { auth };

// For backwards compatibility
export const app = firebase.app();
