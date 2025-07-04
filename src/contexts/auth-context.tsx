
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  authError: string | null;
  authLogs: string[];
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const router = useRouter();

  const addAuthLog = useCallback((message: string) => {
    setAuthLogs(prev => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        // Avoid logging the exact same message twice in a row to reduce noise
        if (prev.length > 0 && prev[prev.length - 1].endsWith(message)) {
            return prev;
        }
        return [...prev, `[${timestamp}] ${message}`];
    });
  }, []);

  useEffect(() => {
    addAuthLog("Auth provider mounted.");
    if (!isFirebaseConfigured || !auth) {
        addAuthLog("Firebase not configured. Halting.");
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        addAuthLog(`Auth state listener fired. Current user: ${user?.email ?? 'null'}.`);
        if (user) {
            // If the listener gives us a user, we are authenticated.
            setUser(user);
            setAuthError(null);
            setLoading(false);
            addAuthLog("Process complete: User is logged in.");
        } else {
            // If there's no user, it could be because we just loaded the page
            // and a redirect result is pending. We must check for it.
            addAuthLog("No user in listener, checking for a pending redirect...");
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    // A user just signed in via redirect.
                    // The onAuthStateChanged listener will fire AGAIN with the new user object.
                    // We just log it and wait for the listener to re-run.
                    addAuthLog(`Redirect result SUCCESSFUL for ${result.user.email}. Waiting for listener to re-fire with user object.`);
                } else {
                    // No user from listener AND no redirect result.
                    // This confirms the user is truly logged out.
                    addAuthLog("No pending redirect found. Process complete: User is logged out.");
                    setUser(null);
                    setLoading(false);
                }
            } catch (error) {
                // An error happened during the redirect sign-in process.
                const caughtError = error as AuthError;
                addAuthLog(`Redirect check FAILED. Code: ${caughtError.code}`);
                setAuthError(caughtError.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : caughtError.message);
                setUser(null);
                setLoading(false);
            }
        }
    });

    return () => {
        addAuthLog("Auth provider unmounting. Unsubscribing listener.");
        unsubscribe();
    };
}, [addAuthLog]);


  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      addAuthLog('Login failed: Firebase not configured.');
      return;
    }
    
    addAuthLog("Initiating Google Sign-In with Redirect...");
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      const caughtError = error as AuthError;
      addAuthLog(`Sign-in initiation failed: ${caughtError.message}`);
      setAuthError(caughtError.message);
    }
  }, [addAuthLog]);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    addAuthLog("Signing out...");
    await firebaseSignOut(auth);
    addAuthLog("Sign out successful.");
    router.push('/');
  }, [addAuthLog, router]);

  const value = useMemo(() => ({ 
    user, 
    loading, 
    isFirebaseConfigured, 
    authError, 
    authLogs,
    signInWithGoogle, 
    signOut 
  }), [user, loading, isFirebaseConfigured, authError, authLogs, signInWithGoogle, signOut]);

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
