
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCDNFpKdz_S6xwrWSF9M5h-yp9ZqoO6Gtg",
  authDomain: "mashup-music-hub.firebaseapp.com",
  projectId: "mashup-music-hub",
  // Tenta o novo padrão do Firebase se o antigo der 404
  storageBucket: "mashup-music-hub.firebasestorage.app",
  messagingSenderId: "700921932715",
  appId: "1:700921932715:web:34178bd2fd9116a64dc0ee"
};

// Inicialização Singleton para garantir que o Firebase seja inicializado apenas uma vez.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
