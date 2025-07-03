
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
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

const publicPaths = ['/'];
const studentPaths = ['/join', '/classroom'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setAuthError(null); // Clear error on successful auth state change
        setLoading(false);
      },
      (error: AuthError) => {
        console.error('Firebase Auth State Error:', error);
        if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/configuration-not-found') {
          const detailedError = `This app's domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please go to your Firebase project's Authentication settings, and under the 'Sign-in method' tab, add this domain to the 'Authorized domains' list.`;
          setAuthError(detailedError);
        } else {
          setAuthError(error.message);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || authError) return; // Don't redirect if there's an error
    
    if (!isFirebaseConfigured) return;

    const isPublic = publicPaths.some(path => pathname.startsWith(path) && path.length === pathname.length);
    const isStudentPath = studentPaths.some(path => pathname.startsWith(path));
    
    if (isStudentPath) return;

    if (!user && !isPublic) {
      router.push('/');
    } else if (user && isPublic) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router, authError]);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errorMsg = 'Firebase is not configured. Cannot sign in.';
      console.error(errorMsg);
      setAuthError(errorMsg);
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthError(null);
    } catch (error) {
      const caughtError = error as AuthError;
      console.error('Google Sign-In failed:', caughtError);
      if (caughtError.code === 'auth/unauthorized-domain' || caughtError.code === 'auth/configuration-not-found') {
        const detailedError = `This app's domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please go to your Firebase project's Authentication settings, and under the 'Sign-in method' tab, add this domain to the 'Authorized domains' list.`;
        setAuthError(detailedError);
      } else {
        setAuthError(caughtError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      console.error('Firebase is not configured. Cannot sign out.');
      return;
    }
    await firebaseSignOut(auth);
    router.push('/');
  };

  const value = { user, loading, isFirebaseConfigured, authError, signInWithGoogle, signOut };

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
