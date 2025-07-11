// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// This file now handles DYNAMIC initialization of Firebase for the client.
// This is crucial for CI/CD environments where frontend code cannot access
// environment variables at build time.

// We first check for placeholder values in .env. This is a quick check for local
// development to ensure the developer has set up their environment.
const hasPlaceholderValues =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("YOUR_") ||
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export const isFirebaseConfigured = !hasPlaceholderValues;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// This function is called by the main Provider component when the app starts.
export async function initializeFirebase(): Promise<boolean> {
  if (getApps().length > 0) {
    // If already initialized, just get the existing instances.
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    return true;
  }

  if (!isFirebaseConfigured) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Firebase is not configured with valid values. App will not initialize.");
    }
    return false;
  }
  
  try {
    // This is the dynamic part. We call the Cloud Function to get config values.
    const functions = getFunctions(getApp());
    const getFirebaseConfig = httpsCallable(functions, 'getFirebaseConfig');
    const result = await getFirebaseConfig();
    const remoteConfig = result.data;
    
    // Use the fetched config to initialize the app.
    app = initializeApp(remoteConfig as object);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    return true;
  } catch (e) {
    console.error("Failed to initialize Firebase with remote config", e);
    return false;
  }
}

export { app, auth, db, googleProvider };
