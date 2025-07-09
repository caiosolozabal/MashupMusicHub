
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { generateRandomPastelColor } from '@/lib/utils';


// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | null;

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole; // Kept for convenience, derived from userDetails.role
  dj_percentual: number | null; // Kept for convenience, derived from userDetails.dj_percentual
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userDetails: null,
  loading: true,
  role: null, 
  dj_percentual: null,
});

// A new client component to safely render the Firebase initialization error message on the client side only.
function FirebaseInitError() {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // This effect runs only on the client.
    // If auth or db is not available after mount, we can safely show the error.
    if (!auth || !db) {
      setShowError(true);
    }
  }, []);

  if (!showError) {
    // Render nothing initially to match the server render.
    return null;
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg font-semibold">Initializing Firebase...</p>
      <p className="mt-2 text-sm text-muted-foreground">
        If this message persists, it likely means Firebase could not initialize.
        This is often due to missing or incorrect Firebase configuration.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Please check your browser&apos;s developer console for detailed error messages
        and ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>)
        are correctly set up in a <code>.env.local</code> file at the root of your project.
      </p>
    </div>
  );
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  // role and dj_percentual will be derived from userDetails but kept for quick access
  const [role, setRole] = useState<UserRole>(null);
  const [djPercentual, setDjPercentual] = useState<number | null>(null);


  useEffect(() => {
    setIsMounted(true); // Component is now mounted on the client

    if (!auth || !db) { 
      setLoading(false); // Ensure loading stops if Firebase isn't initialized
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Set loading to true at the start of auth change
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          // CRITICAL STEP: Force a refresh of the ID token to get custom claims.
          // This must happen before any Firestore reads that depend on security rules.
          await getIdTokenResult(currentUser, true);
          console.log('ID token has been refreshed with custom claims.');

          const userDocSnap = await getDoc(userDocRef);
          let fetchedUserDetails: UserDetails;

          if (userDocSnap.exists()) {
            fetchedUserDetails = userDocSnap.data() as UserDetails;
          } else {
            // User exists in Auth but not Firestore (e.g. first login)
            // Create a default user profile
            fetchedUserDetails = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New User',
              role: 'dj', // Default role
              dj_percentual: 0.7, // Default percentage (70%)
              dj_color: generateRandomPastelColor(),
            };
            await setDoc(userDocRef, { ...fetchedUserDetails, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            console.log(`New user profile created in Firestore for ${currentUser.uid}`);
          }
          
          setUser(currentUser);
          setUserDetails(fetchedUserDetails);
          setRole(fetchedUserDetails.role);
          setDjPercentual(fetchedUserDetails.dj_percentual ?? null);

        } catch (error) {
          console.error("Error fetching/creating user document:", error);
          setUser(null);
          setUserDetails(null);
          setRole(null);
          setDjPercentual(null);
        }
      } else {
        setUser(null);
        setUserDetails(null);
        setRole(null);
        setDjPercentual(null);
      }
      setLoading(false); // Set loading to false only after all async operations are complete
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    userDetails,
    loading,
    role, // Derived from userDetails.role
    dj_percentual: djPercentual // Derived from userDetails.dj_percentual
  }), [user, userDetails, loading, role, djPercentual]);

  // Check for firebase initialization failure outside the main return.
  if (!auth || !db) {
    // This component now safely handles client-side only rendering of the error.
    return <FirebaseInitError />;
  }
  
  // To prevent hydration mismatch, we must ensure that the initial render on the client
  // is identical to the server render. We show a loader until the component is mounted on the client
  // and auth state is confirmed.
  const showLoader = !isMounted || loading;

  return (
    <AuthContext.Provider value={value}>
      {showLoader ? (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg font-semibold">Verificando Autenticação...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
