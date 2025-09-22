
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

      adminApp = initializeApp({
        projectId,
        // In development, this will use the default credentials
        // In production, you'd want to add proper service account credentials
      });
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
