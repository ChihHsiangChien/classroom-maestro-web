'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
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

// Define paths that are public or for students, and do not require teacher authentication.
const publicPaths = ['/']; // The homepage
const studentPaths = ['/join', '/classroom']; // Any path starting with these is for students.

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
        setAuthError(null); 
        setLoading(false);
      },
      (error: AuthError) => {
        console.error('Firebase Auth State Error:', error);
        if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/configuration-not-found') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(error.message);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // This useEffect handles all application-level route protection and redirection.
  useEffect(() => {
    // Do not run redirection logic until authentication is fully loaded and there are no platform errors.
    if (loading || authError) {
      return;
    }

    const isStudentPath = studentPaths.some(path => pathname.startsWith(path));
    
    // Rule 1: Always allow access to student-facing pages, regardless of auth state.
    // This is crucial for anonymous students joining a class.
    if (isStudentPath) {
      return; 
    }

    // Rule 2: If a logged-in user is on the homepage, redirect them to their dashboard.
    if (user && pathname === '/') {
      router.push('/dashboard');
      return;
    }
    
    // Rule 3: If a user is NOT logged in and tries to access any other (protected) page, redirect to home.
    const isPublicPath = publicPaths.includes(pathname);
    if (!user && !isPublicPath) {
      router.push('/');
      return;
    }

  }, [user, loading, authError, pathname, router]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errorMsg = 'Firebase is not configured. Cannot sign in.';
      console.error(errorMsg);
      setAuthError(errorMsg);
      return;
    }
    setLoading(true);
    try {
      // Explicitly set persistence to local storage.
      // This can help with issues in some browser environments.
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setAuthError(null);
      // Let the useEffect handle the redirection to the dashboard.
    } catch (error) {
      const caughtError = error as AuthError;
      // This is expected user behavior, not an actual error to be shown to the user.
      if (caughtError.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in popup closed by user.");
        // We exit early. The 'finally' block will still run to set loading to false.
        return;
      }

      // For all other errors, log them and set the error state.
      console.error('Google Sign-In failed:', caughtError);
      if (caughtError.code === 'auth/unauthorized-domain' || caughtError.code === 'auth/configuration-not-found') {
        setAuthError('unauthorized-domain');
      } else {
        setAuthError(caughtError.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      console.error('Firebase is not configured. Cannot sign out.');
      return;
    }
    await firebaseSignOut(auth);
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
