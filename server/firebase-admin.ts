
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: any = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    const apps = getApps();
    
    if (apps.length === 0) {
      // For now, we'll use a simplified setup
      // In production, you'd want to add proper service account credentials
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
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
