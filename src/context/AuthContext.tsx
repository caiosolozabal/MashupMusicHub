'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (currentUser) {
        // User is logged in, now fetch their profile from Firestore.
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Use onSnapshot to listen for real-time changes
          const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserDetails({ uid: docSnap.id, ...docSnap.data() } as UserDetails);
            } else {
              // This can happen if the user exists in Auth but not in Firestore DB
              console.warn(`User profile for ${currentUser.uid} not found in Firestore.`);
              setUserDetails(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error fetching user profile with onSnapshot:", error);
            setUserDetails(null);
            setLoading(false);
          });
          
          // Return the firestore unsubscribe function to be called on cleanup
          return unsubscribeFirestore;

        } catch (error) {
          console.error("Error setting up user profile listener:", error);
          setUserDetails(null);
          setLoading(false);
        }
      } else {
        // User is logged out.
        setUserDetails(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

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
