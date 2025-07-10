
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // role and dj_percentual will be derived from userDetails but kept for quick access
  const [role, setRole] = useState<UserRole>(null);
  const [djPercentual, setDjPercentual] = useState<number | null>(null);


  useEffect(() => {
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

  // The provider now always renders its children,
  // letting consumer components decide what to show based on the 'loading' state.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
