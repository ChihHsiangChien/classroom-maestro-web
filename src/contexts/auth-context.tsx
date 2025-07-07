
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const log = (message: string) => console.log(`[AUTH] ${new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}: ${message}`);

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    log("AuthProvider mounted. Setting up auth listener.");
    if (!isFirebaseConfigured || !auth || !db) {
      log("Firebase not configured. Halting.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        log(`onAuthStateChanged: Teacher is logged in: ${user.email}`);
        
        const userDocRef = doc(db, 'users', user.uid);
        const adminDocRef = doc(db, 'admins', user.uid);

        try {
            // Check for admin status
            const adminDocSnap = await getDoc(adminDocRef);
            const userIsAdmin = adminDocSnap.exists();
            setIsAdmin(userIsAdmin);
            log(`Admin status for ${user.email}: ${userIsAdmin}`);
            
            // Create or update user document in 'users' collection
            await setDoc(userDocRef, {
                displayName: user.displayName,
                email: user.email,
                uid: user.uid,
            }, { merge: true });

        } catch (error) {
            console.error("Error checking admin status or setting user doc:", error);
            setIsAdmin(false);
        }
        
        setUser(user);

      } else if (user && user.isAnonymous) {
        log(`onAuthStateChanged: Anonymous user detected: ${user.uid}`);
        setUser(user);
        setIsAdmin(false);
      }
      else {
        log("onAuthStateChanged: User is logged out.");
        setUser(null);
        setIsAdmin(false);
      }
      log("Auth state confirmed. Loading is now false.");
      setLoading(false);
    });

    return () => {
      log("Cleaning up auth listener.");
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error("Firebase is not configured. Cannot sign in.");
    }
    log("signInWithGoogle called. Initiating popup sign-in.");
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    log("signOut called...");
    await firebaseSignOut(auth);
    log("Sign out successful. onAuthStateChanged will set user to null.");
    router.push('/');
  }, [router]);
  
  const handleSignInAnonymously = useCallback(async (): Promise<User | null> => {
    if (!auth) return null;
    // We let the calling function handle the error, so it can display a specific message.
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  }, []);

  useEffect(() => {
    if (loading) return;

    if (user && !user.isAnonymous) {
      // Don't auto-redirect if on the admin page
      if (router.pathname?.startsWith('/dashboard/admin')) return;
      
      log("User is logged in, redirecting to /dashboard");
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  const value = useMemo(() => ({
    user,
    isAdmin,
    loading,
    isFirebaseConfigured,
    signInWithGoogle,
    signOut,
    signInAnonymously: handleSignInAnonymously,
  }), [user, isAdmin, loading, isFirebaseConfigured, signInWithGoogle, signOut, handleSignInAnonymously]);

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
