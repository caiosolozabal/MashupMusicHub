import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration for the OLD Firebase project
const oldFirebaseConfig = {
  apiKey: "AIzaSyDSCEY8ugpjMW-_UotWpwYp8ZWLziC0Vlk",
  authDomain: "listeiro-cf302.firebaseapp.com",
  projectId: "listeiro-cf302",
  storageBucket: "listeiro-cf302.appspot.com",
  messagingSenderId: "782774474874",
  appId: "1:782774474874:web:520dd515bf8895bd4d03c3"
};

// Initialize a separate, named Firebase app for the old project
// This prevents conflicts with the primary Firebase app instance
const oldApp: FirebaseApp = initializeApp(oldFirebaseConfig, 'old-db-migration');

// Get the Firestore instance for the old app
const db_old: Firestore = getFirestore(oldApp);

export { db_old };
