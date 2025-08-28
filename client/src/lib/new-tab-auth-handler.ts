import { auth } from "./firebase";
import { AuthDomainHandler } from "./auth-domain-handler";

// Specifically handle new tab authentication scenarios
export class NewTabAuthHandler {
  private static readonly CHECK_INTERVAL = 2000; // 2 seconds
  private static readonly MAX_RETRIES = 10; // 20 seconds total
  private static retryCount = 0;
  private static checkInterval: number | null = null;

  // Initialize new tab authentication handling
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Start checking auth state immediately when page loads
    this.startAuthCheck();

    // Also check when page becomes visible (user switches to this tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('Tab became visible, checking auth state');
        this.startAuthCheck();
      }
    });

    // Check when window gains focus
    window.addEventListener('focus', () => {
      console.log('Window gained focus, checking auth state');
      this.startAuthCheck();
    });

    console.log('New tab auth handler initialized');
  }

  // Start periodic auth checking
  private static startAuthCheck(): void {
    // Clear any existing interval
    this.stopAuthCheck();
    
    this.retryCount = 0;
    this.checkInterval = window.setInterval(() => {
      this.checkAuthState();
    }, this.CHECK_INTERVAL);

    // Also check immediately
    this.checkAuthState();
  }

  // Stop auth checking
  private static stopAuthCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check current auth state and attempt recovery
  private static async checkAuthState(): Promise<void> {
    this.retryCount++;

    try {
      // If we have a user, stop checking
      if (auth?.currentUser) {
        console.log('Auth state confirmed, stopping checks');
        this.stopAuthCheck();
        return;
      }

      // Try to restore from storage
      const restored = await AuthDomainHandler.restoreAuthFromStorage();
      if (restored) {
        console.log('Auth restored from storage');
        this.stopAuthCheck();
        return;
      }

      // If we've tried too many times, stop checking
      if (this.retryCount >= this.MAX_RETRIES) {
        console.log('Max auth check retries reached, stopping');
        this.stopAuthCheck();
        return;
      }

      console.log(`Auth check attempt ${this.retryCount}/${this.MAX_RETRIES}`);

    } catch (error) {
      console.error('Error during auth state check:', error);
    }
  }

  // Force immediate auth check (can be called manually)
  static async forceCheck(): Promise<boolean> {
    try {
      if (auth?.currentUser) {
        return true;
      }

      return await AuthDomainHandler.restoreAuthFromStorage();
    } catch (error) {
      console.error('Force auth check failed:', error);
      return false;
    }
  }
}

// Initialize when module loads
if (typeof window !== 'undefined') {
  // Wait a bit for Firebase to initialize
  setTimeout(() => {
    NewTabAuthHandler.initialize();
  }, 500);
}