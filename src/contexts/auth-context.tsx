
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

    // This listener is the single source of truth for the user's auth state.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      log(`onAuthStateChanged listener fired. User: ${user?.email ?? 'Not Logged In'}`);
      setUser(user);
      setLoading(false); // Only set loading to false AFTER we have a definitive user state.
      log("Auth state confirmed. Loading is now false.");
    });

    // Check for redirect result to handle errors, but don't rely on it for user state.
    // The onAuthStateChanged listener above will handle the user object correctly.
    getRedirectResult(auth).catch((error: AuthError) => {
      log(`Error from getRedirectResult: ${error.code}`);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('unauthorized-domain');
      } else {
        setAuthError(error.message);
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
      return;
    }
    
    log("Initiating Google Sign-In with Redirect...");
    setLoading(true); // Show loading state immediately on click
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
