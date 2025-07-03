
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setAuthError(null); 
        setLoading(false);
      },
      (error: AuthError) => {
        console.error('Firebase Auth State Error:', error);
        if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/configuration-not-found') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(error.message);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errorMsg = 'Firebase is not configured. Cannot sign in.';
      console.error(errorMsg);
      setAuthError(errorMsg);
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthError(null);
      // On successful sign-in, always go to the dashboard.
      router.push('/dashboard');
    } catch (error) {
      const caughtError = error as AuthError;
      console.error('Google Sign-In failed:', caughtError);
      if (caughtError.code === 'auth/unauthorized-domain' || caughtError.code === 'auth/configuration-not-found') {
        setAuthError('unauthorized-domain');
      } else {
        setAuthError(caughtError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      console.error('Firebase is not configured. Cannot sign out.');
      return;
    }
    await firebaseSignOut(auth);
    router.push('/');
  };

  const value = { user, loading, isFirebaseConfigured, authError, signInWithGoogle, signOut };

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
