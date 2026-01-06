'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';

// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | 'financeiro' | null;

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null; 
  loading: boolean;
  role: UserRole;
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
    // This listener handles Firebase Authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true); // Always start loading when auth state changes
      setUser(currentUser);
      if (!currentUser) {
        // If user logs out, clear everything and stop loading
        setUserDetails(null);
        setLoading(false);
      }
      // The rest is handled by the second useEffect which depends on `user`
    });

    // Cleanup the auth subscription on component unmount
    return () => unsubscribeAuth();
  }, []);


  useEffect(() => {
    // This listener handles Firestore user profile changes
    if (user) {
      // Don't set loading to true here, auth state change already did
      const userDocRef = doc(db, 'users', user.uid);
      
      // onSnapshot listens for real-time updates to the user's profile
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          // If the document exists, update userDetails state
          setUserDetails({ uid: docSnap.id, ...docSnap.data() } as UserDetails);
        } else {
          // If the doc doesn't exist (e.g., deleted from backend), clear details
          console.warn(`User profile for ${user.uid} not found in Firestore.`);
          setUserDetails(null);
        }
        // Finished loading profile data
        setLoading(false);
      }, (error) => {
        // Handle errors fetching the document
        console.error("Error fetching user profile:", error);
        setUserDetails(null);
        setLoading(false);
      });

      // Cleanup the Firestore subscription when the user changes or component unmounts
      return () => unsubscribeFirestore();
    } else {
      // No user, no need to listen to Firestore, ensure loading is false
      if (loading) { // Only update state if needed
          setUserDetails(null);
          setLoading(false);
      }
    }
  }, [user]); // This effect runs whenever the `user` object changes

  const value = useMemo(() => ({
    user,
    userDetails,
    loading,
    role: userDetails?.role ?? null,
  }), [user, userDetails, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
