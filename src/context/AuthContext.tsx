
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { generateRandomPastelColor } from '@/lib/utils';
import { Loader2 } from 'lucide-react';


// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | null;

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole; // Kept for convenience, derived from userDetails.role
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userDetails: null,
  loading: true,
  role: null, 
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) { 
      setLoading(false); 
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); 
      if (currentUser) {
        try {
          // CRITICAL STEP: Force a refresh of the ID token to get custom claims.
          // This makes the user's role available in firestore.rules via request.auth.token.role
          const idTokenResult = await getIdTokenResult(currentUser, true);
          const claimsRole = idTokenResult.claims.role as UserRole || null;

          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let fetchedUserDetails: UserDetails;

          if (userDocSnap.exists()) {
            fetchedUserDetails = userDocSnap.data() as UserDetails;
            // Ensure the role in Firestore matches the custom claim.
            // This syncs up any changes made by an admin to a user's role.
            if (fetchedUserDetails.role !== claimsRole) {
               console.warn(`Role mismatch for ${currentUser.uid}. Claim: ${claimsRole}, Firestore: ${fetchedUserDetails.role}. Using claim role.`);
               fetchedUserDetails.role = claimsRole;
            }

          } else {
            // User exists in Auth but not Firestore (e.g. first login)
            // Create a default user profile. The 'role' will be set by a Cloud Function trigger on user creation,
            // but we can default to 'dj' on the client for immediate UI feedback.
            fetchedUserDetails = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New User',
              role: claimsRole || 'dj', // Use claim role if available, otherwise default
              dj_percentual: 0.7, // Default percentage (70%)
              dj_color: generateRandomPastelColor(),
            };
            await setDoc(userDocRef, { ...fetchedUserDetails, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          }
          
          setUser(currentUser);
          setUserDetails(fetchedUserDetails);

        } catch (error) {
          console.error("AuthContext Error: Error fetching user data or claims:", error);
          setUser(null);
          setUserDetails(null);
        }
      } else {
        setUser(null);
        setUserDetails(null);
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    userDetails,
    loading,
    role: userDetails?.role ?? null,
  }), [user, userDetails, loading]);

  // The provider now always renders its children,
  // letting consumer components decide what to show based on the 'loading' state.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
