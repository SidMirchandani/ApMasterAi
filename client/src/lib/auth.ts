import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User,
  UserCredential,
  browserPopupRedirectResolver,
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

// Sign in with Google — tries popup first; if blocked, uses redirect
export const signInWithGoogle = async (): Promise<UserCredential | void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error(
      "Authentication is not configured. Please contact support.",
    );
  }

  const provider = new GoogleAuthProvider();

  try {
    return await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
    const isPopupBlocked =
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/popup-closed-by-user";

    if (isPopupBlocked) {
      await signInWithRedirect(auth, provider);
      return; // Page will redirect; result handled by getGoogleRedirectResult on return
    }
    throw err;
  }
};

// Call on login/signup page load to handle return from Google redirect
export const getGoogleRedirectResult = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch {
    return null;
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
