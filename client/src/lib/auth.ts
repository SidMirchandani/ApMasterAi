import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential
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
export const signUpWithEmail = async ({ email, password }: SignUpData): Promise<UserCredential> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Authentication is not configured. Please contact support.");
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create account");
  }
};

// Sign in with email and password
export const loginWithEmail = async ({ email, password }: LoginData): Promise<UserCredential> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Authentication is not configured. Please contact support.");
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    throw new Error(error.message || "Failed to login");
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Authentication is not configured. Please contact support.");
  }
  
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || "Failed to logout");
  }
};

// Convert Firebase User to AuthUser
export const convertFirebaseUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  };
};