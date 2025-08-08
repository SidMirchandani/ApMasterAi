// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBr45b5l2j7mnTU6fZieRpyydAKz6VsOXU",
  authDomain: "gen-lang-client-0260042933.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0260042933-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gen-lang-client-0260042933",
  storageBucket: "gen-lang-client-0260042933.firebasestorage.app",
  messagingSenderId: "473292929444",
  appId: "1:473292929444:web:9c31efee894902acc3a931",
  measurementId: "G-0MB631YLJ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

export const db = getFirestore(app);

export default app;