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
    console.log('[DEBUG AuthContext] Setting up onAuthStateChanged listener...');
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(true); // Always loading when auth state changes
      console.log('[DEBUG AuthContext] Auth state changed. currentUser:', currentUser ? currentUser.uid : null);

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        console.log(`[DEBUG AuthContext] User logged in. Subscribing to Firestore doc: ${userDocRef.path}`);
        
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = { uid: docSnap.id, ...docSnap.data() } as UserDetails;
            console.log('[DEBUG AuthContext] SUCCESS: Firestore document found. UserDetails:', data);
            setUserDetails(data);
          } else {
            console.error(`[DEBUG AuthContext] FATAL: User profile for ${currentUser.uid} not found in Firestore.`);
            setUserDetails(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("[DEBUG AuthContext] FATAL: Error fetching user profile with onSnapshot:", error);
          setUserDetails(null);
          setLoading(false);
        });
        
        return () => {
          console.log(`[DEBUG AuthContext] Cleanup: Unsubscribing from Firestore doc: ${userDocRef.path}`);
          unsubscribeFirestore();
        }
      } else {
        console.log('[DEBUG AuthContext] No user logged in. Clearing userDetails.');
        setUserDetails(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('[DEBUG AuthContext] Cleanup: Unsubscribing from onAuthStateChanged.');
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    userDetails,
    loading,
    role: userDetails?.role ?? null,
  }), [user, userDetails, loading]);

  console.log('[DEBUG AuthContext] Context value updated:', { loading: value.loading, role: value.role, user: value.user?.uid, userDetails: !!value.userDetails });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
