
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBr45b5l2j7mnTU6fZieRpyydAKz6VsOXU",
  authDomain: "gen-lang-client-0260042933.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0260042933-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gen-lang-client-0260042933",
  storageBucket: "gen-lang-client-0260042933.firebasestorage.app",
  messagingSenderId: "473292929444",
  appId: "1:473292929444:web:8059cc0877bfa25bc3a931",
  measurementId: "G-05S2K1MXDJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

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
