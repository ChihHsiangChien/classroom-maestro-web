
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

const log = (message: string) => console.log(`[AUTH] ${new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}: ${message}`);

interface AuthContextType {
  user: User | null;
  loading: boolean; // For initial app load
  isSigningIn: boolean; // For the popup sign-in flow
  isFirebaseConfigured: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    log("AuthProvider mounted. Setting up auth listener.");
    if (!isFirebaseConfigured || !auth) {
      log("Firebase not configured. Halting.");
      setAuthError("Firebase is not configured. Please check your .env file.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        log(`onAuthStateChanged: User is logged in: ${user.email}`);
        setUser(user);
      } else {
        log("onAuthStateChanged: User is logged out.");
        setUser(null);
      }
      log("Auth state confirmed. Loading is now false.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider || isSigningIn) {
      return;
    }
    
    log("signInWithGoogle called. Initiating popup sign-in.");
    setIsSigningIn(true);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      log(`signInWithPopup Success! User authenticated: ${result.user.email}`);
      // onAuthStateChanged will handle setting the user and redirecting.
    } catch (error) {
        const caughtError = error as AuthError;
        if (caughtError.code === 'auth/popup-closed-by-user') {
            log('signInWithPopup Error: Popup closed by user.');
            setAuthError('The sign-in popup was closed before completion.');
        } else if (caughtError.code === 'auth/unauthorized-domain') {
            log('signInWithPopup Error: Unauthorized domain.');
            setAuthError('unauthorized-domain');
        } else {
            log(`signInWithPopup Error: ${caughtError.code} - ${caughtError.message}`);
            setAuthError(caughtError.message);
        }
    } finally {
        setIsSigningIn(false);
    }
  }, [isSigningIn]);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("signOut called...");
    await firebaseSignOut(auth);
    log("Sign out successful. onAuthStateChanged will set user to null.");
    router.push('/');
  }, [router]);

  const value = useMemo(() => ({
    user,
    loading,
    isSigningIn,
    isFirebaseConfigured,
    authError,
    signInWithGoogle,
    signOut
  }), [user, loading, isSigningIn, isFirebaseConfigured, authError, signInWithGoogle, signOut]);

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
