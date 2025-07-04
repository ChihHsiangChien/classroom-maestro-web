
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
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

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errorMsg = 'Firebase is not configured. Cannot sign in.';
      console.error(errorMsg);
      setAuthError(errorMsg);
      return;
    }
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      // On success, the onAuthStateChanged listener will handle the user state and loading state.
    } catch (error) {
      const caughtError = error as AuthError;
      // These are not "errors" but normal user actions. We can ignore them.
      if (caughtError.code === 'auth/popup-closed-by-user' || caughtError.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in popup closed by user.");
      } else {
        console.error('Google Sign-In failed:', caughtError);
        if (caughtError.code === 'auth/unauthorized-domain' || caughtError.code === 'auth/configuration-not-found') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      console.error('Firebase is not configured. Cannot sign out.');
      return;
    }
    await firebaseSignOut(auth);
    router.push('/');
  }, [router]);

  const value = useMemo(() => ({ 
    user, 
    loading, 
    isFirebaseConfigured, 
    authError, 
    signInWithGoogle, 
    signOut 
  }), [user, loading, isFirebaseConfigured, authError, signInWithGoogle, signOut]);

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
