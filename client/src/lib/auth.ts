import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User,
  UserCredential,
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
