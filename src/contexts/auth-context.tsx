
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

  // This effect runs on component mount to handle the result of a redirect login
  // and to set up the main auth state listener.
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    
    // First, check for redirect result. This is crucial for catching errors from the redirect flow.
    getRedirectResult(auth)
      .catch((error: AuthError) => {
        console.error('Google Redirect Sign-In failed:', error);
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(error.message);
        }
      });

    // Then, set up the onAuthStateChanged listener. This is the single source of truth
    // for the user's sign-in state. It will fire after getRedirectResult has been processed.
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        if (user) {
          setAuthError(null); 
        }
        setLoading(false); // Auth state is now definitive, stop loading.
      },
      (error: AuthError) => {
        console.error('Firebase Auth State Error:', error);
        setAuthError(error.message);
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
    setLoading(true); // Indicate that an async action is starting before navigating away.
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
      // The user will be redirected away. The result is handled by the useEffect hook on the next page load.
    } catch (error) {
      const caughtError = error as AuthError;
      console.error('Google Sign-In Redirect initiation failed:', caughtError);
      setAuthError(caughtError.message);
      setLoading(false);
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
