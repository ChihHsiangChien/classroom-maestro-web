
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

    // This listener is the single source of truth for the user object.
    // It will be called whenever the auth state changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      log(`onAuthStateChanged listener fired. User: ${user ? user.email : 'Not Logged In'}`);
      setUser(user);
      // We DO NOT set loading to false here, to avoid race conditions.
    });

    // We process the redirect result to "wake up" the auth state.
    // The onAuthStateChanged listener above will then fire with the correct user.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          log(`getRedirectResult: Success! User authenticated: ${result.user.email}`);
        } else {
          log("getRedirectResult: No new redirect result to process.");
        }
      })
      .catch((error) => {
        const caughtError = error as AuthError;
        log(`getRedirectResult Error: ${caughtError.code}`);
        if (caughtError.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
      })
      .finally(() => {
        // THIS IS THE KEY: We only stop loading AFTER getRedirectResult has
        // completed. By this point, onAuthStateChanged has had a chance
        // to fire with the correct, post-redirect user state.
        log("Initial auth check complete. Setting loading to false.");
        setLoading(false);
      });

    return () => {
        log("AuthProvider unmounting. Cleaning up auth listener.");
        unsubscribe();
    };
  }, []);


  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      log('Login failed: Firebase not configured.');
      setAuthError("Firebase is not configured. Please check your .env file.");
      return;
    }
    
    log("signInWithGoogle called. Setting loading=true and initiating redirect.");
    setLoading(true);
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      log("Auth persistence set to 'local'.");
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
    log("signOut called...");
    await firebaseSignOut(auth);
    log("Sign out successful. User will be null and page will redirect.");
    // onAuthStateChanged will set user to null, and the page component logic will handle redirect.
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
