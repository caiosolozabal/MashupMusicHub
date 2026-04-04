
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { generateRandomPastelColor } from '@/lib/utils';

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

const createNewUserProfile = async (user: User) => {
  console.log(`Creating new user profile for ${user.uid}`);
  const userDocRef = doc(db, 'users', user.uid);
  const newUserDetails: Omit<UserDetails, 'uid'> = {
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
    role: 'dj', // Default technical role
    professionalType: 'DJ', // Default display function
    dj_percentual: 0.7, // Default 70%
    rental_percentual: 0.2, // Default 20%
    pode_locar: false,
    dj_color: generateRandomPastelColor(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(userDocRef, newUserDetails);
  console.log(`New user profile created for ${user.uid}`);
  return { uid: user.uid, ...newUserDetails } as UserDetails;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = { uid: docSnap.id, ...docSnap.data() } as UserDetails;
            setUserDetails(data);
          } else {
            // User exists in Auth, but not in Firestore. Create the profile.
            console.warn(`User profile for ${currentUser.uid} not found. Creating...`);
            try {
              const newProfile = await createNewUserProfile(currentUser);
              setUserDetails(newProfile);
            } catch (error) {
              console.error("Failed to create new user profile:", error);
              setUserDetails(null); // Explicitly set to null on failure
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserDetails(null);
          setLoading(false);
        });

        return () => {
          unsubscribeFirestore();
        };

      } else {
        setUserDetails(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
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
