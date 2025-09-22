
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    const apps = getApps();
    
    if (apps.length === 0) {
      // Initialize with project ID from environment
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is required');
      }
      
      console.log('Initializing Firebase Admin with project ID:', projectId);
      
      // Check if we're in development mode (Replit)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
      
      try {
        // Check if we have a service account key
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (serviceAccountKey) {
          // Use service account key for authentication (production/Vercel)
          const serviceAccount = JSON.parse(serviceAccountKey);
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId,
          });
          console.log('Firebase Admin initialized with service account for project:', projectId);
        } else if (isDevelopment || isReplit) {
          // For development/Replit, initialize without credentials
          // This will use the client-side Firebase config for auth
          console.log('Development/Replit environment detected - initializing without server credentials');
          adminApp = initializeApp({
            projectId,
            // Don't attempt to use server credentials in development
            credential: undefined
          });
          console.log('Firebase Admin initialized for development with project:', projectId);
        } else {
          // Production fallback
          adminApp = initializeApp({
            projectId,
          });
          console.log('Firebase Admin initialized with default credentials for project:', projectId);
        }
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        // In development, we can continue without Firebase Admin
        if (isDevelopment || isReplit) {
          console.warn('Continuing without Firebase Admin in development mode');
          return null;
        }
        throw error;
      }
    } else {
      adminApp = apps[0];
    }
  }
  
  return adminApp ? {
    auth: getAuth(adminApp),
    firestore: getFirestore(adminApp),
    app: adminApp
  } : null;
}

export async function verifyFirebaseToken(token: string) {
  try {
    const firebaseAdmin = getFirebaseAdmin();
    
    // In development mode without Firebase Admin, we'll skip server-side verification
    if (!firebaseAdmin) {
      console.warn('Firebase Admin not available - skipping server-side token verification in development');
      // Return a mock verification result for development
      return {
        uid: 'dev-user',
        email: 'dev@example.com',
        name: 'Development User'
      };
    }
    
    const { auth } = firebaseAdmin;
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
    
    // In development, be more lenient
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
    
    if (isDevelopment || isReplit) {
      console.warn('Token verification failed in development - continuing with mock user');
      return {
        uid: 'dev-user',
        email: 'dev@example.com', 
        name: 'Development User'
      };
    }
    
    throw new Error('Invalid authentication token');
  }
}
