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
          // Use service account key for authentication
          const serviceAccount = JSON.parse(serviceAccountKey);
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId,
          });
          console.log('Firebase Admin initialized with service account for project:', projectId);
        } else {
          // Fallback to default credentials
          adminApp = initializeApp({
            projectId,
          });
          console.log('Firebase Admin initialized with default credentials for project:', projectId);
        }
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
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

    if (!firebaseAdmin) {
      throw new Error('Firebase Admin not available');
    }

    const { auth } = firebaseAdmin;
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid authentication token');
  }
}

