import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User,
  UserCredential,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth, isFirebaseEnabled } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

function getFirebaseAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

function mapFirebaseAuthError(error: unknown, fallback: string): string {
  const code = getFirebaseAuthErrorCode(error);
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "This reset link is invalid or has expired. Please request a new one.";
    case "auth/weak-password":
      return "Password is too weak. Choose a stronger password (at least 6 characters).";
    default:
      return error instanceof Error ? error.message : fallback;
  }
}

function getPasswordResetContinueUrl(): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) || "";
  if (!base) {
    throw new Error(
      "Cannot build password reset URL. Set NEXT_PUBLIC_SITE_URL for server contexts or use the app in a browser.",
    );
  }
  return `${base.replace(/\/$/, "")}/reset-password`;
}

/** Sends Firebase password reset email when the account supports email/password sign-in. */
export const requestPasswordResetEmail = async (email: string): Promise<void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Please enter your email address.");
  }

  try {
    await sendPasswordResetEmail(auth, trimmed, {
      url: getPasswordResetContinueUrl(),
      handleCodeInApp: false,
    });
  } catch (error: unknown) {
    throw new Error(mapFirebaseAuthError(error, "Failed to send reset email."));
  }
};

/** Returns the account email if `oobCode` from the reset link is still valid. */
export const getEmailFromPasswordResetCode = async (
  oobCode: string,
): Promise<string> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  try {
    return await verifyPasswordResetCode(auth, oobCode);
  } catch (error: unknown) {
    throw new Error(mapFirebaseAuthError(error, "Invalid or expired reset link."));
  }
};

export const completePasswordReset = async (
  oobCode: string,
  newPassword: string,
): Promise<void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
  } catch (error: unknown) {
    throw new Error(mapFirebaseAuthError(error, "Failed to reset password."));
  }
};

// Sign up with email and password
export const signUpWithEmail = async ({
  email,
  password,
}: SignUpData): Promise<UserCredential> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create account";
    throw new Error(errorMessage);
  }
};

// Sign in with email and password
export const loginWithEmail = async ({
  email,
  password,
}: LoginData): Promise<UserCredential> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to login";
    throw new Error(errorMessage);
  }
};

// Sign in with Google — redirect-only (no popups)
export const signInWithGoogle = async (): Promise<void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("googleRedirectPending", "1");
    }
    await signInWithRedirect(auth, provider);
    return; // Page will redirect; result handled by getGoogleRedirectResult on return
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to login with Google";
    throw new Error(errorMessage);
  }
};

// Call on login/signup page load to handle return from Google redirect
export const getGoogleRedirectResult = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch (error: unknown) {
    // Surface redirect errors to the UI layer so it can message the user.
    const errorMessage = error instanceof Error ? error.message : "Google sign-in redirect failed";
    throw new Error(errorMessage);
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  try {
    await signOut(auth);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to logout";
    throw new Error(errorMessage);
  }
};

// Convert Firebase User to AuthUser
export const convertFirebaseUser = (user: User | null): AuthUser | null => {
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
};
