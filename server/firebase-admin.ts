
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: any = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    const apps = getApps();
    
    if (apps.length === 0) {
      try {
        // Try to use service account if available
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
          : null;

        if (serviceAccount) {
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
        } else {
          // Fallback to project ID only (for development)
          adminApp = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
        }
      } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        // Fallback initialization
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      adminApp = apps[0];
    }
  }
  
  return {
    auth: getAuth(adminApp),
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
