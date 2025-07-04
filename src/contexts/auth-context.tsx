
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithRedirect,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  getRedirectResult,
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

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          log(`getRedirectResult SUCCESS! User: ${result.user.email}`);
        } else {
          log("getRedirectResult: No new redirect result to process.");
        }
      })
      .catch((error: AuthError) => {
        log(`getRedirectResult ERROR: ${error.code} - ${error.message}`);
        setAuthError(error.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : error.message);
      })
      .finally(() => {
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
        
        return () => {
          log("Cleaning up auth listener.");
          unsubscribe();
        }
      });
  }, []);


  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      return;
    }
    
    log("signInWithGoogle called. Initiating REDIRECT sign-in.");
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      const e = error as AuthError;
      log(`signInWithRedirect ERROR: ${e.code} - ${e.message}`);
      setAuthError(e.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : e.message);
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("signOut called...");
    await firebaseSignOut(auth);
    log("Sign out successful. onAuthStateChanged will set user to null.");
    router.push('/');
  }, [router]);
  
  useEffect(() => {
    if (loading || authError) return;

    if (user) {
        log("User is logged in, redirecting to /dashboard");
        router.push('/dashboard');
    }
  }, [user, loading, authError, router]);


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
