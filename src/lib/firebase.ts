
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDSCEY8ugpjMW-_UotWpwYp8ZWLziC0Vlk",
  authDomain: "listeiro-cf302.firebaseapp.com",
  projectId: "listeiro-cf302",
  storageBucket: "listeiro-cf302.appspot.com",
  messagingSenderId: "782774474874",
  appId: "1:782774474874:web:520dd515bf8895bd4d03c3"
};

// Inicialização Singleton para garantir que o Firebase seja inicializado apenas uma vez.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
