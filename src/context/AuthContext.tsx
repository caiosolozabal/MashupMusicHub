'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { generateRandomPastelColor } from '@/lib/utils';

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
  const userDocRef = doc(db, 'users', user.uid);
  const newUserDetails: Omit<UserDetails, 'uid'> = {
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
    role: 'dj',
    professionalType: 'DJ',
    dj_percentual: 0.7,
    rental_percentual: 0.2,
    pode_locar: false,
    dj_color: generateRandomPastelColor(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(userDocRef, newUserDetails);
  return { uid: user.uid, ...newUserDetails } as UserDetails;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Limpa listener anterior do Firestore se houver mudança de conta
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = { uid: docSnap.id, ...docSnap.data() } as UserDetails;
            setUserDetails(data);
          } else {
            try {
              const newProfile = await createNewUserProfile(currentUser);
              setUserDetails(newProfile);
            } catch (error) {
              console.error("Failed to create new user profile:", error);
              setUserDetails(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserDetails(null);
          setLoading(false);
        });
      } else {
        setUserDetails(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
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
