
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

    // This function encapsulates the entire auth state check.
    const checkAuthStatus = async () => {
      try {
        // First, process any pending redirect result.
        // This is the crucial step to "tell Firebase who I am" after returning from Google.
        // It must complete before onAuthStateChanged can reliably give us the user.
        await getRedirectResult(auth);
      } catch (error) {
        // Handle specific redirect errors here.
        const caughtError = error as AuthError;
        console.error('Google Redirect Sign-In failed:', caughtError);
        if (caughtError.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
        // Even if the redirect fails, we continue to onAuthStateChanged,
        // which will likely confirm the user is null, and then we stop loading.
      }

      // After the redirect is processed, onAuthStateChanged becomes the single source of truth.
      // It will fire with the user from the redirect, or null if there's no user.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        if (user) {
            setAuthError(null);
        }
        // Only set loading to false once we have a definitive answer.
        setLoading(false);
      }, (error) => {
        console.error("Firebase Auth State Error:", error);
        setAuthError(error.message);
        setLoading(false);
      });
      
      // The `useEffect` cleanup function will be the one returned by onAuthStateChanged.
      return unsubscribe;
    };
    
    // Run the check.
    const unsubscribePromise = checkAuthStatus();

    // The actual cleanup function for the useEffect.
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
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
    // The redirect logic in page.tsx will handle routing to '/'.
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
