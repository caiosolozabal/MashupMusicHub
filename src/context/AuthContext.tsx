
'use client';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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

// Função de correção de emergência
const emergencyFixUserData = async (uid: string) => {
  if (uid !== 'EHF5NOE47IUzfC2ikacf5la54Ar2') return;

  const userDocRef = doc(db, 'users', uid);
  
  console.log(`[EMERGENCY FIX] Checking profile for ${uid}...`);
  try {
    const userData: Omit<UserDetails, 'createdAt' | 'updatedAt'> = {
        uid: "EHF5NOE47IUzfC2ikacf5la54Ar2",
        displayName: "Solô",
        email: "caiosolozabal@gmail.com",
        role: "dj",
        dj_color: "hsl(195, 100%, 80%)",
        dj_percentual: 0.7,
        pode_locar: true,
        rental_percentual: 0.8,
        pixKey: "48.716.222/0001-31",
        bankAccount: null,
        bankAccountType: null,
        bankAgency: null,
        bankDocument: null,
        bankName: null,
    };
    // Sobrescreve o documento para garantir que ele tenha os dados corretos.
    await setDoc(userDocRef, {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true }); // Usar merge para não destruir outros campos se houver
    console.log(`[EMERGENCY FIX] Profile for ${uid} was successfully recreated/updated.`);
  } catch (error) {
    console.error("[EMERGENCY FIX] Error recreating profile:", error);
  }
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
        // Tenta a correção de emergência ANTES de ativar o listener
        await emergencyFixUserData(currentUser.uid);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = { uid: docSnap.id, ...docSnap.data() } as UserDetails;
            setUserDetails(data);
          } else {
            console.error(`User profile for ${currentUser.uid} not found in Firestore.`);
            setUserDetails(null);
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
