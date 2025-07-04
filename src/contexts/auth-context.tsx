
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

const log = (message: string) => console.log(`[AUTH] ${new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}: ${message}`);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    log("AuthProvider mounted. Setting up auth listener.");
    if (!isFirebaseConfigured || !auth) {
      log("Firebase not configured. Halting.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        log(`onAuthStateChanged: User is logged in: ${user.email}`);
        setUser(user);
      } else {
        log("onAuthStateChanged: User is logged out.");
        setUser(null);
      }
      log("Auth state confirmed. Loading is now false.");
      setLoading(false);
    });

    return () => {
      log("Cleaning up auth listener.");
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error("Firebase is not configured. Cannot sign in.");
    }
    log("signInWithGoogle called. Initiating popup sign-in.");
    // No try/catch here. Let the calling component handle it.
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("signOut called...");
    await firebaseSignOut(auth);
    log("Sign out successful. onAuthStateChanged will set user to null.");
    router.push('/');
  }, [router]);
  
  useEffect(() => {
    if (loading) return;

    if (user) {
      log("User is logged in, redirecting to /dashboard");
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  const value = useMemo(() => ({
    user,
    loading,
    isFirebaseConfigured,
    signInWithGoogle,
    signOut
  }), [user, loading, isFirebaseConfigured, signInWithGoogle, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
