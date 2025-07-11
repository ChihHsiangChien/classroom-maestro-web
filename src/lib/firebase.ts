// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";

// This file now handles DYNAMIC initialization of Firebase.
// This is crucial for CI/CD environments where frontend code cannot access
// environment variables at build time.

// We first check for placeholder values in .env. This is a synchronous check for local
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
        
        // Create a temporary, minimal app instance to call the function.
        const tempApp = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }, 'temp-for-config');
        const functions = getFunctions(tempApp, 'asia-east1');
        const getFirebaseConfig = httpsCallable(functions, 'getFirebaseConfig');
        
        const result = await getFirebaseConfig();
        const remoteConfig = result.data;

        // Initialize the main, default Firebase app with the fetched config.
        app = initializeApp(remoteConfig as object);

      } else {
        // --- LOCAL DEVELOPMENT LOGIC ---
        // In development, we use the .env.local file.
        console.log("Development environment detected. Initializing Firebase from .env.local.");
        
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
