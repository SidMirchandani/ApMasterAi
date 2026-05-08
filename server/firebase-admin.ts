import {
  initializeApp,
  getApps,
  cert,
  App,
  ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { loadServiceAccountJson } from "./firebase-service-account";

let adminApp: App | null = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    const apps = getApps();

    if (apps.length === 0) {
      // Initialize with project ID from environment
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error(
          "NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is required",
        );
      }
      try {
        const storageBucket =
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          "gen-lang-client-0260042933.firebasestorage.app";
        const serviceAccount = loadServiceAccountJson();

        if (serviceAccount) {
          adminApp = initializeApp({
            credential: cert(serviceAccount as ServiceAccount),
            projectId,
            storageBucket,
          });
        } else {
          // Fallback to default credentials (e.g. GCP metadata / gcloud ADC)
          adminApp = initializeApp({
            projectId,
            storageBucket,
          });
        }
      } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
        throw error;
      }
    } else {
      adminApp = apps[0];
    }
  }

  return adminApp
    ? {
        auth: getAuth(adminApp),
        firestore: getFirestore(adminApp),
        storage: getStorage(adminApp),
        app: adminApp,
      }
    : null;
}

export async function verifyFirebaseToken(token: string) {
  try {
    const firebaseAdmin = getFirebaseAdmin();

    if (!firebaseAdmin) {
      throw new Error("Firebase Admin not available");
    }

    const { auth } = firebaseAdmin;
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error("Invalid authentication token");
  }
}
