
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/'];
const studentPaths = ['/join', '/classroom'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only set up auth listener if Firebase is configured and auth object is valid
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If not configured, stop loading and proceed without a user
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // If firebase is not configured, don't redirect. Let the UI show the error.
    if (!isFirebaseConfigured) return;

    const isPublic = publicPaths.some(path => pathname.startsWith(path) && path.length === pathname.length);
    const isStudentPath = studentPaths.some(path => pathname.startsWith(path));
    
    if (isStudentPath) return;

    if (!user && !isPublic) {
      router.push('/');
    } else if (user && isPublic) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      console.error("Firebase is not configured. Cannot sign in.");
      return;
    }
    setLoading(true);
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      console.error("Firebase is not configured. Cannot sign out.");
      return;
    }
    await firebaseSignOut(auth);
    router.push('/');
  };

  const value = { user, loading, isFirebaseConfigured, signInWithGoogle, signOut };

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
