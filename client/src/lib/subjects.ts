
import { getAuthHeaders } from "./queryClient";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export interface Subject {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  userId: string;
  dateAdded: string;
}

export async function getSubjects(): Promise<Subject[]> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      throw new Error("User not authenticated");
    }

    // Get the user ID from auth headers
    const userId = authHeaders['X-User-ID'];
    if (!userId) {
      throw new Error("User ID not found");
    }

    const subjectsRef = collection(db, "userSubjects");
    const q = query(subjectsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Subject));
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }
}

export async function addSubject(subject: Omit<Subject, 'id' | 'userId' | 'dateAdded'>): Promise<Subject> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      throw new Error("User not authenticated");
    }

    const userId = authHeaders['X-User-ID'];
    if (!userId) {
      throw new Error("User ID not found");
    }

    const subjectData = {
      ...subject,
      userId,
      dateAdded: new Date().toISOString(),
    };

    const subjectsRef = collection(db, "userSubjects");
    const docRef = await addDoc(subjectsRef, subjectData);
    
    return { id: docRef.id, ...subjectData };
  } catch (error) {
    console.error("Error adding subject:", error);
    throw error;
  }
}

export async function removeSubject(subjectId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      throw new Error("User not authenticated");
    }

    await deleteDoc(doc(db, "userSubjects", subjectId));
  } catch (error) {
    console.error("Error removing subject:", error);
    throw error;
  }
}
