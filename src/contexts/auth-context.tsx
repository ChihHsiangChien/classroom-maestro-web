
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

    // This is a flag to ensure we don't set loading to false until the redirect check is complete.
    let redirectResultProcessed = false;

    // This listener is the single source of truth for the user's auth state.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      log(`onAuthStateChanged listener fired. User: ${user?.email ?? 'Not Logged In'}`);
      setUser(user);
      
      // Only set loading to false if we've already checked for a redirect result.
      // This prevents the initial "no user" state from prematurely ending the loading state
      // when a redirect is in progress.
      if (redirectResultProcessed) {
        log("Auth state confirmed (post-redirect check). Loading is now false.");
        setLoading(false);
      }
    });

    // Check for redirect result to handle login, but rely on onAuthStateChanged for state.
    getRedirectResult(auth)
      .catch((error: AuthError) => {
        log(`Error from getRedirectResult: ${error.code}`);
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(error.message);
        }
      })
      .finally(() => {
        // No matter the outcome, we now know the redirect has been processed.
        log("Redirect result processing finished.");
        redirectResultProcessed = true;
        
        // If there's no user at this point (and onAuthStateChanged hasn't fired with one),
        // it means no one was logged in and no successful redirect occurred.
        // It's now safe to stop loading. If onAuthStateChanged already fired, this does nothing.
        // If it hasn't fired yet, it will handle setting loading to false when it does.
        if (!auth.currentUser) {
            log("No current user after redirect check. Stopping loading.");
            setLoading(false);
        }
      });

    return () => {
      log("AuthProvider unmounting. Cleaning up listener.");
      unsubscribe();
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
    } catch (error) {
      const caughtError = error as AuthError;
      log(`Sign-in initiation failed: ${caughtError.code} - ${caughtError.message}`);
      setAuthError(caughtError.message);
      setLoading(false);
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
