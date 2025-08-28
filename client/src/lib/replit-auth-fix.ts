import { auth } from "./firebase";

// Specific fixes for Replit preview authentication issues
export class ReplitAuthFix {
  private static initialized = false;

  // Initialize Replit-specific auth fixes
  static initialize(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Fix for Replit preview domain issues
    this.setupDomainFixes();
    
    // Setup storage event listener for cross-tab authentication
    this.setupStorageListener();
    
    // Setup periodic auth check
    this.setupPeriodicAuthCheck();
    
    console.log('Replit auth fixes initialized');
  }

  // Setup domain-specific fixes
  private static setupDomainFixes(): void {
    const currentDomain = window.location.hostname;
    
    // Check if we're in a Replit environment
    if (currentDomain.includes('replit.dev') || currentDomain.includes('replit.app')) {
      console.log('Detected Replit environment, applying domain fixes');
      
      // Override fetch to include proper headers for Replit
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const enhancedInit = {
          ...init,
          credentials: 'include' as RequestCredentials,
          headers: {
            ...init?.headers,
            'X-Replit-Domain': currentDomain,
          }
        };
        
        return originalFetch(input, enhancedInit);
      };
    }
  }

  // Listen for auth changes in other tabs/windows
  private static setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'firebase_auth_token') {
        console.log('Auth token changed in another tab, refreshing auth state');
        
        // Force auth state refresh
        if (auth?.currentUser) {
          auth.currentUser.getIdToken(true).then(() => {
            console.log('Auth token refreshed due to storage change');
          }).catch((error) => {
            console.error('Failed to refresh token after storage change:', error);
          });
        }
      }
    });
  }

  // Periodic auth state verification
  private static setupPeriodicAuthCheck(): void {
    setInterval(() => {
      if (auth?.currentUser) {
        // Verify auth state every 5 minutes
        auth.currentUser.getIdToken(true).then(() => {
          console.log('Periodic auth verification successful');
        }).catch((error) => {
          console.warn('Periodic auth verification failed:', error);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Force auth refresh for new domain contexts
  static async forceAuthRefresh(): Promise<boolean> {
    if (!auth?.currentUser) {
      console.log('No current user for auth refresh');
      return false;
    }

    try {
      await auth.currentUser.getIdToken(true);
      console.log('Forced auth refresh successful');
      return true;
    } catch (error) {
      console.error('Forced auth refresh failed:', error);
      return false;
    }
  }

  // Check if current domain requires special handling
  static requiresSpecialHandling(): boolean {
    const currentDomain = window.location.hostname;
    return currentDomain.includes('replit.dev') || 
           currentDomain.includes('replit.app') ||
           currentDomain.includes('repl.co');
  }
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Initialize after a brief delay to ensure Firebase is ready
  setTimeout(() => {
    ReplitAuthFix.initialize();
  }, 1000);
}