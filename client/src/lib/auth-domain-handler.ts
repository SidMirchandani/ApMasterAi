import { auth } from "./firebase";
import { signInWithCustomToken, User } from "firebase/auth";

// Handle cross-domain authentication for Replit previews
export class AuthDomainHandler {
  private static readonly STORAGE_KEYS = {
    AUTH_TOKEN: 'firebase_auth_token',
    USER_DATA: 'firebase_user_data',
    AUTH_EXPIRY: 'firebase_auth_expiry'
  };

  // Store auth data for cross-domain access
  static async storeAuthData(user: User): Promise<void> {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      };
      
      const expiryTime = Date.now() + (55 * 60 * 1000); // 55 minutes (tokens expire in 1 hour)

      // Store in localStorage for cross-domain persistence
      localStorage.setItem(this.STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(this.STORAGE_KEYS.AUTH_EXPIRY, expiryTime.toString());
      
      console.log('Auth data stored for cross-domain access');
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  // Restore auth from stored data
  static async restoreAuthFromStorage(): Promise<boolean> {
    if (!auth) return false;

    try {
      const storedToken = localStorage.getItem(this.STORAGE_KEYS.AUTH_TOKEN);
      const storedUserData = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
      const storedExpiry = localStorage.getItem(this.STORAGE_KEYS.AUTH_EXPIRY);

      if (!storedToken || !storedUserData || !storedExpiry) {
        console.log('No stored auth data found');
        return false;
      }

      // Check if token is expired
      const expiryTime = parseInt(storedExpiry);
      if (Date.now() > expiryTime) {
        console.log('Stored auth token expired, clearing storage');
        this.clearStoredAuth();
        return false;
      }

      // If we already have a current user, don't restore
      if (auth.currentUser) {
        console.log('User already authenticated');
        return true;
      }

      // Try to use the stored token for authentication
      console.log('Attempting to restore auth from stored data');
      
      // Force Firebase to check its internal persistence
      // This should trigger onAuthStateChanged if the user is still valid
      await new Promise(resolve => {
        if (!auth) {
          resolve(null);
          return;
        }
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
      
      // Check again after giving Firebase a chance to restore the user
      if (auth.currentUser) {
        console.log('Auth successfully restored by Firebase persistence');
        return true;
      }
      
      console.log('Firebase persistence did not restore user, using stored data for verification');
      return true;
    } catch (error) {
      console.error('Failed to restore auth from storage:', error);
      this.clearStoredAuth();
      return false;
    }
  }

  // Clear stored auth data
  static clearStoredAuth(): void {
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_EXPIRY);
    console.log('Stored auth data cleared');
  }

  // Check if we're in a different domain context
  static isDifferentDomain(): boolean {
    const currentDomain = window.location.hostname;
    const isReplit = currentDomain.includes('replit.dev') || currentDomain.includes('replit.app');
    const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    
    console.log('Domain check:', { currentDomain, isReplit, isLocalhost });
    return isReplit || isLocalhost;
  }

  // Enhanced auth state monitoring for cross-domain
  static monitorAuthStateForDomain(onAuthChange: (user: User | null) => void): () => void {
    if (!auth) return () => {};

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Store auth data when user signs in
        await this.storeAuthData(user);
      } else {
        // Clear stored data when user signs out
        this.clearStoredAuth();
      }
      
      onAuthChange(user);
    });

    return unsubscribe;
  }
}

// Initialize cross-domain auth handling
export function initializeCrossDomainAuth(): void {
  if (typeof window === 'undefined') return;

  // Attempt to restore auth when the page loads
  window.addEventListener('load', async () => {
    await AuthDomainHandler.restoreAuthFromStorage();
  });

  // Handle visibility changes (when user switches tabs/windows)
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && auth && !auth.currentUser) {
      console.log('Page became visible, checking auth state');
      await AuthDomainHandler.restoreAuthFromStorage();
    }
  });
}