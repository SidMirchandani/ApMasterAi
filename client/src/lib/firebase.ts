import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Check if all required Firebase config is available
const hasFirebaseConfig = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

// Your web app's Firebase configuration
const firebaseConfig = hasFirebaseConfig ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
} : null;

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function initializeFirebase(): { app: FirebaseApp | null, auth: Auth | null, db: Firestore | null } {
  if (!hasFirebaseConfig || !firebaseConfig) {
    console.warn('Firebase configuration is incomplete. Authentication features will be disabled.');
    return { app: null, auth: null, db: null };
  }

  try {
    // Initialize Firebase app (ensure single instance)
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
    
    // Initialize Firebase Authentication with persistence and error handling
    auth = getAuth(app);
    
    // Set auth language to user's preference
    if (auth) {
      auth.languageCode = 'en';
      
      // Enable auth state persistence (default behavior, but making it explicit)
      auth.settings.appVerificationDisabledForTesting = false;
    }
    
    // Initialize Firestore
    db = getFirestore(app);
    
    console.log('Firebase initialized successfully');
    return { app, auth, db };
    
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return { app: null, auth: null, db: null };
  }
}

// Initialize Firebase
const firebaseInstances = initializeFirebase();
app = firebaseInstances.app;
auth = firebaseInstances.auth;
db = firebaseInstances.db;

// Helper function to ensure auth is ready
export function waitForAuth(): Promise<Auth> {
  return new Promise((resolve, reject) => {
    if (!auth) {
      reject(new Error('Firebase Auth is not initialized'));
      return;
    }
    
    if (auth.currentUser !== undefined) {
      resolve(auth);
      return;
    }
    
    // Wait for initial auth state
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      if (auth) {
        resolve(auth);
      } else {
        reject(new Error('Auth instance became null'));
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Auth initialization timeout'));
    }, 10000);
  });
}

export { auth, db };
export const isFirebaseEnabled = hasFirebaseConfig && !!auth;
export default app;