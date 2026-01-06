
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDSCEY8ugpjMW-_UotWpwYp8ZWLziC0Vlk",
  authDomain: "listeiro-cf302.firebaseapp.com",
  projectId: "listeiro-cf302",
  storageBucket: "listeiro-cf302.appspot.com",
  messagingSenderId: "1083995834879",
  appId: "1:1083995834879:web:3504338423232155c5f4de",
};

// Inicialização Singleton para garantir que o Firebase seja inicializado apenas uma vez.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
