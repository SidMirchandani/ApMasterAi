import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.GEMINI_API_KEY,
  authDomain: "gen-lang-client-0260042933.firebaseapp.com",
  projectId: "gen-lang-client-0260042933",
  storageBucket: "gen-lang-client-0260042933.firebasestorage.app",
  messagingSenderId: "473292929444",
  appId: "1:473292929444:web:9c31efee894902acc3a931",
  measurementId: "G-0MB631YLJ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;