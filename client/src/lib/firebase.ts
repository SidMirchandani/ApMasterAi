import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";
import { getApiCodeForSubject } from "@/subjects";

// Check if all required Firebase config is available
const hasFirebaseConfig = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// Get current domain for proper auth domain configuration
const getCurrentDomain = () => {
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }
  return "localhost";
};

// Your web app's Firebase configuration
const firebaseConfig = hasFirebaseConfig
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
    }
  : null;

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

function initializeFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  if (!hasFirebaseConfig || !firebaseConfig) {
    console.warn(
      "Firebase configuration is incomplete. Authentication features will be disabled.",
    );
    return { app: null, auth: null, db: null };
  }

  try {
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      if (configuredAuthDomain && configuredAuthDomain !== currentHost) {
        console.warn(
          `Firebase authDomain (${configuredAuthDomain}) does not match current host (${currentHost}). ` +
            `Redirect-based sign-in can fail with "missing initial state" if these differ.`,
        );
      }
    }

    // Initialize Firebase app (ensure single instance)
    const existingApps = getApps();
    app =
      existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

    // Initialize Firebase Authentication with persistence and error handling
    auth = getAuth(app);

    // Configure auth settings for cross-origin compatibility
    if (auth) {
      auth.languageCode = "en";

      // Configure auth settings for Replit preview compatibility
      auth.settings.appVerificationDisabledForTesting = false;

      // Enable auth state persistence across domains
      const currentDomain = getCurrentDomain();
    }

    // Initialize Firestore
    db = getFirestore(app);
    return { app, auth, db };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return { app: null, auth: null, db: null };
  }
}

// Initialize Firebase
const firebaseInstances = initializeFirebase();
app = firebaseInstances.app;
auth = firebaseInstances.auth;
db = firebaseInstances.db;

type AnalyticsParamValue = string | number | boolean | null | undefined;

export type AnalyticsSurface =
  | "home"
  | "dashboard"
  | "study"
  | "quiz"
  | "analytics"
  | "result"
  | "login"
  | "signup"
  | "profile"
  | "other";

export type VersionedAnalyticsAction =
  | "dashboard"
  | "study"
  | "quiz"
  | "result_viewed"
  | "practice_start"
  | "question_answered"
  | "practice_complete"
  | "quiz_taken";

export type AnalyticsEventParams = Record<string, AnalyticsParamValue>;

async function getAnalyticsIfSupported(): Promise<{
  analyticsModule: typeof import("firebase/analytics");
  analytics: Analytics;
} | null> {
  if (!app || typeof window === "undefined") {
    return null;
  }

  try {
    const analyticsModule = await import("firebase/analytics");
    if (!(await analyticsModule.isSupported())) {
      return null;
    }

    analytics = analytics ?? analyticsModule.getAnalytics(app);
    return { analyticsModule, analytics };
  } catch (error) {
    console.warn("Unable to initialize Firebase Analytics", error);
    return null;
  }
}

function cleanAnalyticsParams(
  params: AnalyticsEventParams = {},
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
}

export function getAnalyticsPageParams(params: {
  surface: AnalyticsSurface;
  subject?: string | null;
  unit?: string | null;
  pagePath?: string;
  pageTitle?: string;
  pageReferrer?: string | null;
  state?: string | null;
  method?: string;
  userCount?: number;
}): AnalyticsEventParams {
  const pagePath = params.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : "");
  const subject = normalizeAnalyticsSubject(params.subject);
  const state = normalizeAnalyticsState(params.state);

  return {
    surface: params.surface,
    page_path: pagePath,
    page_location:
      typeof window !== "undefined" && pagePath
        ? `${window.location.origin}${pagePath}`
        : undefined,
    page_title:
      params.pageTitle ??
      (typeof document !== "undefined" ? document.title : undefined),
    page_referrer:
      params.pageReferrer ??
      (typeof document !== "undefined" ? document.referrer || null : undefined),
    subject: subject ?? undefined,
    unit: params.unit ?? undefined,
    state,
    method: params.method,
    user_count: params.userCount,
  };
}

export function normalizeAnalyticsSubject(subject?: string | null): string | null {
  const raw = typeof subject === "string" ? subject.trim() : "";
  if (!raw) return null;
  const apiCode = getApiCodeForSubject(raw);
  if (apiCode) return apiCode;
  return /^AP[A-Z0-9]+$/.test(raw.toUpperCase()) ? raw.toUpperCase() : raw;
}

export function normalizeAnalyticsState(state?: string | null): string | null {
  const raw = typeof state === "string" ? state.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

export async function trackPageView(
  params: AnalyticsEventParams,
): Promise<boolean> {
  const supported = await getAnalyticsIfSupported();
  if (!supported) return false;

  try {
    supported.analyticsModule.logEvent(
      supported.analytics,
      "page_view",
      cleanAnalyticsParams(params),
    );
    return true;
  } catch (error) {
    console.warn("Unable to track page_view", error);
    return false;
  }
}

export async function trackVersionedAnalyticsEvent(params: {
  action: VersionedAnalyticsAction;
  params?: AnalyticsEventParams;
}): Promise<boolean> {
  const supported = await getAnalyticsIfSupported();
  if (!supported) return false;

  try {
    supported.analyticsModule.logEvent(
      supported.analytics,
      `v2_${params.action}`,
      cleanAnalyticsParams(params.params),
    );
    return true;
  } catch (error) {
    console.warn("Unable to track analytics event", error);
    return false;
  }
}

// Helper function to ensure auth is ready
export function waitForAuth(): Promise<Auth> {
  return new Promise((resolve, reject) => {
    if (!auth) {
      reject(new Error("Firebase Auth is not initialized"));
      return;
    }

    if (auth.currentUser !== undefined) {
      resolve(auth);
      return;
    }

    // Wait for initial auth state
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      if (auth) {
        resolve(auth);
      } else {
        reject(new Error("Auth instance became null"));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      unsubscribe();
      reject(new Error("Auth initialization timeout"));
    }, 10000);
  });
}

// Import Replit-specific fixes and new tab handler
import "./replit-auth-fix";
import "./new-tab-auth-handler";

export { auth, db, analytics };
export const isFirebaseEnabled = hasFirebaseConfig && !!auth;
export default app;
