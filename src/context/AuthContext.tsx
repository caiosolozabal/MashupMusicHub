
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';


// Define user roles for Mashup Music
export type UserRole = 'admin' | 'partner' | 'dj' | 'financeiro' | null;

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
      console.error("Firebase auth or db not available");
      setLoading(false); 
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        // Fetch user details from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserDetails({ uid: userDocSnap.id, ...userDocSnap.data() } as UserDetails);
        } else {
          console.warn(`User ${currentUser.uid} exists in Auth but not in Firestore. They will have no role.`);
          setUserDetails(null); // Set to null to indicate no permissions
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
