import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  UserCredential
} from "firebase/auth";
import { auth } from "./firebase";

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
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create account");
  }
};

// Sign in with email and password
export const loginWithEmail = async ({ email, password }: LoginData): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    throw new Error(error.message || "Failed to login");
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential;
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign in with Google");
  }
};

// Sign out
export const logout = async (): Promise<void> => {
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