// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";

// This file now handles DYNAMIC initialization of Firebase.
// This is crucial for CI/CD environments where frontend code cannot access
// environment variables at build time.

// --- Smart Configuration Check ---
// In production, we assume config will come from a Cloud Function, so this check should pass.
// In development, we check if the developer has filled in their .env.local file.
let isConfigured: boolean;
if (process.env.NODE_ENV === 'production') {
  isConfigured = true;
} else {
  const hasPlaceholderValues =
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes("YOUR_");
  isConfigured = !hasPlaceholderValues;
}
export const isFirebaseConfigured = isConfigured;


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// This function is called by the main Provider component when the app starts.
export async function initializeFirebase(): Promise<boolean> {
  // If the main app is already initialized, we're good.
  if (getApps().length > 0) {
    app = getApp();
  } else {
    // --- DYNAMIC CONFIGURATION LOGIC ---
    try {
      if (process.env.NODE_ENV === 'production') {
        // --- PRODUCTION LOGIC ---
        // In production (deployed on App Hosting), we must fetch config from our Cloud Function.
        console.log("Production environment detected. Fetching Firebase config from Cloud Function...");
        
        // This is a minimal, temporary config just to be able to call the function.
        // The projectId is usually available in the production environment.
        const tempAppConfig = { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID };
        const tempApp = initializeApp(tempAppConfig, 'temp-for-config');
        const functions = getFunctions(tempApp, 'asia-east1');
        const getFirebaseConfig = httpsCallable(functions, 'getFirebaseConfig');
        
        const result = await getFirebaseConfig();
        const remoteConfig = result.data;

        if (!remoteConfig || !(remoteConfig as any).apiKey) {
            console.error("Fetched remote config is invalid:", remoteConfig);
            return false;
        }

        // Initialize the main, default Firebase app with the fetched config.
        app = initializeApp(remoteConfig as object);

      } else {
        // --- LOCAL DEVELOPMENT LOGIC ---
        // In development, we use the .env.local file.
        console.log("Development environment detected. Initializing Firebase from .env.local.");
        
        // This check is now redundant because of the top-level one, but kept for safety.
        if (!isFirebaseConfigured) {
            console.error("Firebase is not configured with valid values in .env.local. App will not initialize.");
            return false;
        }

        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        app = initializeApp(firebaseConfig);
      }
    } catch (e) {
      console.error("Failed to initialize Firebase", e);
      return false;
    }
  }

  // Once the app is initialized (either way), set up the other services.
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  
  return true;
}

export { app, auth, db, googleProvider };
