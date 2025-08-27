import { auth } from "./firebase";
import type { Auth } from "firebase/auth";

// Retry mechanism for auth operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Auth operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError || new Error("Operation failed after retries");
}

// Enhanced auth token getter with retry and refresh
export async function getAuthToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!auth?.currentUser) {
    return null;
  }
  
  return withRetry(async () => {
    if (!auth?.currentUser) {
      throw new Error("User not authenticated");
    }
    
    return auth.currentUser.getIdToken(forceRefresh);
  });
}

// Enhanced auth state checker
export function isUserAuthenticated(): boolean {
  return !!(auth?.currentUser?.uid);
}

// Wait for auth to be ready with timeout
export async function waitForAuthReady(timeoutMs: number = 10000): Promise<boolean> {
  if (!auth) {
    return false;
  }
  
  return new Promise((resolve) => {
    const authInstance = auth as Auth;
    
    // If already determined, resolve immediately
    if (authInstance.currentUser !== undefined) {
      resolve(!!authInstance.currentUser);
      return;
    }
    
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);
    
    const unsubscribe = authInstance.onAuthStateChanged((user) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        unsubscribe();
        resolve(!!user);
      }
    });
  });
}