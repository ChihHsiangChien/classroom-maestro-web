
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
  browserLocalPersistence,
  GoogleAuthProvider,
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

    // This variable will hold the unsubscribe function for onAuthStateChanged
    let unsubscribe: (() => void) | undefined;

    // First, process the redirect result. This is the most important step.
    getRedirectResult(auth)
      .then((result) => {
        // If the user just signed in via redirect, the result object will contain the user.
        // If the page was just reloaded, the result will be null.
        // In either case, Firebase has now persisted the auth state.
        
        // It's now safe to set up the persistent auth state listener.
        // onAuthStateChanged will now give us the correct user.
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setAuthError(null); // Clear previous errors
          setLoading(false); // We have our definitive answer.
        }, (error) => {
          console.error("Firebase Auth State Error:", error);
          setAuthError(error.message);
          setLoading(false);
        });
      })
      .catch((error) => {
        // Handle errors from getRedirectResult, such as unauthorized domain.
        const caughtError = error as AuthError;
        console.error('Google Redirect Sign-In failed:', caughtError);
        if (caughtError.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
        // Even if the redirect fails, we should stop loading.
        setLoading(false);
      });

    // The cleanup function for the useEffect hook.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
      await signInWithRedirect(auth, googleProvider);
      // No state changes here. The page will redirect away.
      // The result will be handled by getRedirectResult on the next page load.
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
    // After signing out, onAuthStateChanged will set the user to null.
    // The redirect logic in other components will handle routing to '/'.
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
