// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";


const firebaseConfigFromEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured =
  !!firebaseConfigFromEnv.apiKey &&
  !firebaseConfigFromEnv.apiKey.includes("YOUR_") &&
  !!firebaseConfigFromEnv.projectId &&
  !firebaseConfigFromEnv.projectId.includes("YOUR_");


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export async function initializeFirebase(): Promise<boolean> {
  if (app) return true; // Already initialized

  if (!isFirebaseConfigured) {
    // This is an early exit for local dev with placeholder values
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
          "Firebase is not configured with valid values. App will not initialize."
      );
    }
    return false;
  }
  
  try {
    app = initializeApp(firebaseConfigFromEnv);
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
