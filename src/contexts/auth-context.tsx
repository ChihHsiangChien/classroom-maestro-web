
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

// Define paths that do not require teacher authentication.
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

  // This useEffect handles route protection.
  useEffect(() => {
    // Do not run redirection logic until loading is complete and there are no auth errors.
    if (loading || authError) return;

    // Determine if the current path is a public page or a student-facing page.
    const isPublic = publicPaths.includes(pathname);
    const isStudentPath = studentPaths.some(path => pathname.startsWith(path));

    // If the user is on a student path, do not redirect them.
    // This allows anonymous students to access the join/classroom pages.
    if (isStudentPath) {
      return;
    }

    // If the user is not logged in and is trying to access a protected page, redirect to home.
    if (!user && !isPublic) {
      router.push('/');
    } 
    // If a logged-in user is on the home page, redirect them to the dashboard.
    else if (user && isPublic) {
      router.push('/dashboard');
    }
  }, [user, loading, authError, pathname, router]);

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
      // Let the useEffect handle the redirection to the dashboard.
    } catch (error) {
      const caughtError = error as AuthError;
      console.error('Google Sign-In failed:', caughtError);
      if (caughtError.code === 'auth/unauthorized-domain' || caughtError.code === 'auth/configuration-not-found') {
        setAuthError('unauthorized-domain');
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
