
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || apiKey === "your-api-key" || apiKey.trim() === "") {
  throw new Error(
    "Firebase API key is missing or invalid. Add NEXT_PUBLIC_FIREBASE_API_KEY to your .env.local file. " +
    "Get it from Firebase Console → Project Settings → General → Your apps → Web app config."
  );
}

const firebaseConfig = {
  apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (ensure single instance)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  // If app already exists, get the existing instance
  if (error?.code === 'app/duplicate-app') {
    const { getApp } = await import('firebase/app');
    app = getApp();
  } else {
    throw error;
  }
}

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
