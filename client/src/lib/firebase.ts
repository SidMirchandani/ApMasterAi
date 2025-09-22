import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Check if all required Firebase config is available
const hasFirebaseConfig = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// Get current domain for proper auth domain configuration
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

// Your web app's Firebase configuration
const firebaseConfig = hasFirebaseConfig ? {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
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
    
    // Configure auth settings for cross-origin compatibility
    if (auth) {
      auth.languageCode = 'en';
      
      // Configure auth settings for Replit preview compatibility
      auth.settings.appVerificationDisabledForTesting = false;
      
      // Enable auth state persistence across domains
      const currentDomain = getCurrentDomain();
      console.log('Configuring Firebase auth for domain:', currentDomain);
      
      // Set custom domain configuration for Replit preview
      if (currentDomain.includes('replit.dev') || currentDomain.includes('replit.app')) {
        console.log('Configuring for Replit domain');
      }
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

// Import Replit-specific fixes and new tab handler
import "./replit-auth-fix";
import "./new-tab-auth-handler";

export { auth, db };
export const isFirebaseEnabled = hasFirebaseConfig && !!auth;
export default app;