
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
      
      // Check if we're in emulator mode
      const useEmulator = process.env.NODE_ENV === 'development';
      if (useEmulator) {
        console.log('Development mode detected - make sure Firebase emulators are running if needed');
      }

      try {
        // For development with Firebase emulator or using Application Default Credentials
        adminApp = initializeApp({
          projectId,
          // This will work with Firebase emulators or Google Cloud default credentials
        });
        
        console.log('Firebase Admin initialized with project:', projectId);
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error;
      }
    } else {
      adminApp = apps[0];
    }
  }
  
  return {
    auth: getAuth(adminApp),
    firestore: getFirestore(adminApp),
    app: adminApp
  };
}

export async function verifyFirebaseToken(token: string) {
  try {
    const { auth } = getFirebaseAdmin();
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid authentication token');
  }
}
