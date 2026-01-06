
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mashup-music-hub.firebaseapp.com",
  projectId: "mashup-music-hub",
  storageBucket: "mashup-music-hub.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  // Substitua as chaves de Platzhalter por valores reais se precisar
  // Normalmente, o Firebase SDK pode obter esses valores se o projeto estiver configurado
  if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.projectId === "mashup-music-hub") {
     console.warn(
      "----------------------------------------------------------------------------------\n" +
      "IMPORTANT: Firebase Configuration May Need Your Input\n" +
      "----------------------------------------------------------------------------------\n" +
      "The Firebase config has been pointed to the correct 'mashup-music-hub' project.\n" +
      "For a production build, you might need to replace placeholder values in\n" +
      "`src/lib/firebase.ts` with actual values from your Firebase project settings.\n" +
      "However, for development with the Firebase CLI, this might work automatically.\n" +
      "----------------------------------------------------------------------------------"
    );
  }

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
      "Ensure your Firebase project (mashup-music-hub) is correctly set up in the Firebase console\n" +
      "(e.g., Authentication, Firestore, Storage services are enabled) and that the\n" +
      "configuration values in `src/lib/firebase.ts` are accurate for this project.\n" +
      "----------------------------------------------------------------------------------"
    );
  }
}

// @ts-ignore
export { app, auth, db, storage };
