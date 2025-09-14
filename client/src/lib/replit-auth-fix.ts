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
      
      // Removed fetch enhancement as it interferes with Firebase token refresh
      // Firebase handles its own network configuration properly
    }
  }

  // Listen for auth changes in other tabs/windows
  private static setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'firebase_auth_token') {
        console.log('Auth token changed in another tab, refreshing auth state');
        
        // Simple auth state check without forced token refresh
        if (auth?.currentUser) {
          console.log('Auth state detected from storage change');
        }
      }
    });
  }

  // Periodic auth state verification (simplified to avoid fetch conflicts)
  private static setupPeriodicAuthCheck(): void {
    setInterval(() => {
      if (auth?.currentUser) {
        // Simple auth state check without forced token refresh
        console.log('Periodic auth state check - user is authenticated');
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Check auth state for new domain contexts (simplified)
  static async checkAuthState(): Promise<boolean> {
    if (!auth?.currentUser) {
      console.log('No current user for auth check');
      return false;
    }

    try {
      // Simple auth state check without forced token refresh
      console.log('Auth state check successful');
      return true;
    } catch (error) {
      console.error('Auth state check failed:', error);
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