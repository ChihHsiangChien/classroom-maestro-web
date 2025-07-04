
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
  signInWithGoogle: () => void; // Changed to synchronous
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

    // This function encapsulates the entire startup auth logic.
    const initializeAuth = async () => {
      try {
        // First, process any redirect result. This is crucial.
        const result = await getRedirectResult(auth);
        if (result) {
          log(`getRedirectResult: Success! User authenticated: ${result.user.email}`);
          // The onAuthStateChanged listener below will handle setting the user.
        } else {
          log("getRedirectResult: No new redirect result to process.");
        }
      } catch (error) {
        const caughtError = error as AuthError;
        log(`getRedirectResult Error: ${caughtError.code}`);
        if (caughtError.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(caughtError.message);
        }
      } finally {
        // AFTER processing the redirect, set up the persistent listener.
        // This listener is now the single source of truth for the user state
        // and for ending the loading state.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          log(`onAuthStateChanged listener fired. User: ${user ? user.email : 'Not Logged In'}`);
          setUser(user);
          log("Auth state confirmed. Loading is now false.");
          setLoading(false);
        });

        // We don't return unsubscribe directly from the async function.
        // In a real app with more complex cleanup, you might store it in a ref.
        // For this component's lifecycle, this is sufficient.
      }
    };

    initializeAuth();

    // Since the listener is set up inside an async function,
    // we don't have a direct `unsubscribe` to return here.
    // However, onAuthStateChanged registers a listener that persists
    // until the component unmounts or it's manually unsubscribed.
    // The component's unmount will clean it up.
  }, []);


  const signInWithGoogle = useCallback(() => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      log('Login failed: Firebase not configured.');
      setAuthError("Firebase is not configured. Please check your .env file.");
      return;
    }
    
    log("signInWithGoogle called. Setting persistence and initiating redirect.");
    
    // This is now a synchronous-looking flow from the caller's perspective
    // to satisfy stricter browser requirements (like Firefox).
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        log("Auth persistence set to 'local'. Initiating redirect.");
        return signInWithRedirect(auth, googleProvider);
      })
      .catch((error) => {
        const caughtError = error as AuthError;
        log(`Sign-in initiation failed: ${caughtError.code} - ${caughtError.message}`);
        setAuthError(caughtError.message);
      });
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("signOut called...");
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
