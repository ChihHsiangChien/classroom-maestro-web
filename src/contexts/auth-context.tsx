
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult,
  signOut as firebaseSignOut, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
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

    // This listener is our single source of truth for the user object.
    // It fires on initial load, and again after a successful redirect sign-in is processed.
    // We wait for this to resolve before setting loading to false.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setAuthError(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Auth State Error:", error);
      setAuthError(error.message);
      setLoading(false);
    });

    // Separately, process the redirect result upon returning to the app.
    // This is primarily for catching specific redirect errors.
    // We don't need the user object from this, as onAuthStateChanged will provide it.
    getRedirectResult(auth).catch((error: AuthError) => {
        console.error('Google Redirect Sign-In failed:', error);
        // This is a common error when the user is not in an authorized domain.
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(error.message);
        }
        // Even on error, we let onAuthStateChanged handle setting loading to false,
        // as it will eventually determine the final auth state (likely null).
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errorMsg = 'Firebase is not configured. Cannot sign in.';
      console.error(errorMsg);
      setAuthError(errorMsg);
      return;
    }
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      // signInWithRedirect will unmount the current page, so no state changes are needed here.
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      const caughtError = error as AuthError;
      console.error('Google Sign-In Redirect initiation failed:', caughtError);
      setAuthError(caughtError.message);
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
