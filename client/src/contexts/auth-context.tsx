import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { auth, isFirebaseEnabled, waitForAuth } from "../lib/firebase";
import { AuthUser, convertFirebaseUser } from "@/lib/auth";
import { initializeAuthPersistence, monitorAuthStability } from "@/lib/auth-persistence";
import { AuthDomainHandler, initializeCrossDomainAuth } from "@/lib/auth-domain-handler";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isFirebaseEnabled: boolean;
  error: string | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    if (!auth?.currentUser) return;

    try {
      // Force token refresh to ensure we have the latest token
      await auth.currentUser.getIdToken(true);
      const authUser = convertFirebaseUser(auth.currentUser);
      setUser(authUser);
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      setError('Authentication refresh failed');
    }
  };

  useEffect(() => {
    let mounted = true;
    let stabilityCleanup: (() => void) | undefined;

    const initializeAuth = async () => {
      if (!isFirebaseEnabled) {
        console.warn('Firebase is not enabled or configured properly');
        if (mounted) {
          setLoading(false);
          setError('Firebase authentication is not configured');
        }
        return;
      }

      try {
        // Initialize cross-domain auth handling
        initializeCrossDomainAuth();

        // Initialize auth persistence first
        await initializeAuthPersistence();

        // Monitor auth state stability
        stabilityCleanup = monitorAuthStability();

        // Try to restore auth from storage (for cross-domain scenarios)
        await AuthDomainHandler.restoreAuthFromStorage();

        // Wait for auth to be ready
        const authInstance = await waitForAuth();

        if (!mounted) return;

        // Set up enhanced auth state listener with cross-domain support
        const unsubscribe = AuthDomainHandler.monitorAuthStateForDomain(
          (firebaseUser: User | null) => {
            if (!mounted) return;

            try {
              const authUser = convertFirebaseUser(firebaseUser);
              setUser(authUser);
              setError(null);
              console.log('Auth state changed (cross-domain):', { 
                uid: firebaseUser?.uid, 
                email: firebaseUser?.email,
                authenticated: !!firebaseUser,
                domain: window.location.hostname
              });
            } catch (error) {
              console.error('Error processing auth state change:', error);
              setError('Authentication processing error');
              setUser(null);
            } finally {
              setLoading(false);
            }
          }
        );

        // Also keep the standard listener for fallback
        const standardUnsubscribe = onAuthStateChanged(authInstance, 
          (firebaseUser: User | null) => {
            if (!mounted) return;

            try {
              const authUser = convertFirebaseUser(firebaseUser);
              setUser(authUser);
              setError(null);
              console.log('Auth state changed (standard):', { 
                uid: firebaseUser?.uid, 
                email: firebaseUser?.email,
                authenticated: !!firebaseUser 
              });
            } catch (error) {
              console.error('Error processing auth state change:', error);
              setError('Authentication processing error');
              setUser(null);
            } finally {
              setLoading(false);
            }
          },
          (error) => {
            if (!mounted) return;
            console.error('Auth state change error:', error);
            setError(error.message);
            setUser(null);
            setLoading(false);
          }
        );

        // Also listen to ID token changes for more reliable auth state
        const tokenUnsubscribe = onIdTokenChanged(authInstance, 
          (firebaseUser: User | null) => {
            if (!mounted) return;

            // Only update if there's a significant change
            const currentUserId = user?.uid;
            const newUserId = firebaseUser?.uid;

            if (currentUserId !== newUserId) {
              const authUser = convertFirebaseUser(firebaseUser);
              setUser(authUser);
              console.log('ID token changed:', { 
                oldUid: currentUserId, 
                newUid: newUserId 
              });
            }
          }
        );

        // Cleanup function
        return () => {
          unsubscribe();
          standardUnsubscribe();
          tokenUnsubscribe();
          if (stabilityCleanup) {
            stabilityCleanup();
          }
        };

      } catch (error) {
        if (!mounted) return;
        console.error('Auth initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Authentication initialization failed');
        setLoading(false);
      }
    };

    const cleanup = initializeAuth();

    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user && isFirebaseEnabled,
    isFirebaseEnabled,
    error,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}