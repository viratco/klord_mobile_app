import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDoAIaqomjQFi6IlYSBr7ivR-W6XBGJWKQ",
    authDomain: "klord-energy-9f18e.firebaseapp.com",
    projectId: "klord-energy-9f18e",
    storageBucket: "klord-energy-9f18e.firebasestorage.app",
    messagingSenderId: "201877204290",
    appId: "1:201877204290:web:c0cf1a87f3b2b1c7feacdb"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
