
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error: any) {
    console.error('Firebase initialization failed. See details below.');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    console.error(
      "----------------------------------------------------------------------------------\n" +
      "Firebase Initialization Issue\n" +
      "----------------------------------------------------------------------------------\n" +
      "This might be due to missing Firebase environment variables (NEXT_PUBLIC_FIREBASE_*).\n" +
      "Ensure your project is correctly set up and environment variables are loaded.\n" +
      "----------------------------------------------------------------------------------"
    );
  }
}

// @ts-ignore
export { app, auth, db, storage };
