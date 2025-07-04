
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

const log = (message: string) => console.log(`[AUTH] ${new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}: ${message}`);

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
    log("AuthProvider mounted. Initializing auth sequence.");
    if (!isFirebaseConfigured || !auth) {
      log("Firebase not configured. Halting.");
      setAuthError("Firebase is not configured. Please check your .env file.");
      setLoading(false);
      return;
    }

    // This async function ensures we await the redirect result before setting the definitive auth state listener.
    const initializeAuth = async () => {
      try {
        // First, process the redirect result. This might sign the user in.
        const result = await getRedirectResult(auth);
        if (result) {
          log(`Redirect result processed successfully. User: ${result.user.email}`);
        } else {
          log("No redirect result to process.");
        }
      } catch (error) {
        const caughtError = error as AuthError;
        log(`Error processing redirect result: ${caughtError.code}`);
        if (caughtError.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
      }

      // After redirect is handled, the onAuthStateChanged listener is the single source of truth.
      // It will fire with the user from the redirect, a user from a previous session, or null.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        log(`onAuthStateChanged listener fired. User: ${user?.email ?? 'Not Logged In'}`);
        setUser(user);
        
        // Only now, after we have a definitive user state, do we stop loading.
        setLoading(false);
        log("Auth state confirmed. Loading is now false.");
      });

      return unsubscribe;
    };

    const unsubscribePromise = initializeAuth();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          log("AuthProvider unmounting. Cleaning up listener.");
          unsubscribe();
        }
      });
    };
  }, []);


  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      log('Login failed: Firebase not configured.');
      setAuthError("Firebase is not configured. Please check your .env file.");
      return;
    }
    
    log("Initiating Google Sign-In with Redirect...");
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
      // After this call, the page navigates away. No more code in this function will execute on this page load.
    } catch (error) {
      const caughtError = error as AuthError;
      log(`Sign-in initiation failed: ${caughtError.code} - ${caughtError.message}`);
      setAuthError(caughtError.message);
      setLoading(false); // This is needed if the redirect call itself throws an error.
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("Signing out...");
    await firebaseSignOut(auth);
    log("Sign out successful. User will be null and page will redirect.");
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
