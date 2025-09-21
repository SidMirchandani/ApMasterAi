import { auth } from "./firebase";
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";

// Ensure Firebase auth persistence is set correctly
export async function initializeAuthPersistence(): Promise<void> {
  if (!auth) {
    console.warn("Auth not initialized, cannot set persistence");
    return;
  }

  try {
    // Use local persistence for better user experience
    // This means users stay logged in even after closing the browser
    await setPersistence(auth, browserLocalPersistence);
    console.log("Firebase auth persistence set to local");
  } catch (error) {
    console.error("Failed to set auth persistence:", error);
    
    // Fallback to session persistence
    try {
      await setPersistence(auth, browserSessionPersistence);
      console.log("Firebase auth persistence set to session (fallback)");
    } catch (fallbackError) {
      console.error("Failed to set fallback auth persistence:", fallbackError);
    }
  }
}

// Check if user should remain logged in
export function shouldMaintainSession(): boolean {
  try {
    // Check if user has chosen to stay logged in (you can customize this logic)
    const rememberMe = localStorage.getItem("rememberMe");
    return rememberMe === "true";
  } catch {
    return true; // Default to maintaining session
  }
}

// Set remember me preference
export function setRememberMe(remember: boolean): void {
  try {
    localStorage.setItem("rememberMe", remember.toString());
  } catch (error) {
    console.warn("Could not save remember me preference:", error);
  }
}

// Enhanced auth state monitoring
let authStateStable = false;
let authStateTimeout: number | null = null;

export function monitorAuthStability(): (() => void) | undefined {
  if (!auth) return undefined;

  // Reset stability flag on auth state changes
  const unsubscribe = auth.onAuthStateChanged(() => {
    authStateStable = false;
    
    // Clear existing timeout
    if (authStateTimeout) {
      clearTimeout(authStateTimeout);
    }
    
    // Mark as stable after 2 seconds of no changes
    authStateTimeout = setTimeout(() => {
      authStateStable = true;
      console.log("Auth state stabilized");
    }, 2000);
  });

  // Return cleanup function
  return () => {
    unsubscribe();
    if (authStateTimeout) {
      clearTimeout(authStateTimeout);
    }
  };
}

export function isAuthStateStable(): boolean {
  return authStateStable;
}