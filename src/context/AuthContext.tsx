
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure firebase is initialized before auth is imported
import { onAuthStateChanged } from 'firebase/auth';
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
          setUserDetails(userDocSnap.data() as UserDetails);
        } else {
          // If user exists in Auth but not Firestore, create a placeholder.
          // This might happen on first login after migration if something went wrong.
          console.warn(`User ${currentUser.uid} exists in Auth but not in Firestore. Creating a default profile.`);
          const newUserDetails: UserDetails = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Novo Usuário',
            role: null, // Critical: role is null until assigned by an admin
            dj_percentual: 0.7,
            rental_percentual: 0.2,
            dj_color: generateRandomPastelColor(),
            pode_locar: false,
          };
          try {
            await setDoc(userDocRef, { ...newUserDetails, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setUserDetails(newUserDetails);
          } catch (error) {
             console.error("Failed to create user profile in Firestore:", error);
             setUserDetails(null); // Explicitly set to null on failure
          }
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
