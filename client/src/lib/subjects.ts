import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // Assuming firebaseConfig.ts exports db
import { getAuthHeaders } from "./queryClient"; // Import from queryClient where it's actually defined
import { Subject } from "@/types"; // Assuming Subject type is defined in types.ts

export async function getSubjects(): Promise<Subject[]> {
  try {
    // Try API first
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      throw new Error("User not authenticated");
    }

    const response = await fetch('/api/user/subjects', {
      headers: authHeaders,
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }

    // Fallback to Firestore if API fails
    if (!db) {
      console.warn("API failed and Firebase not initialized, returning empty array");
      return [];
    }

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
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

export async function addSubject(subject: Subject): Promise<void> {
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

    // Add userId to the subject data before saving to Firestore
    const subjectWithUserId = { ...subject, userId: userId };

    // Generate a new document ID
    const newSubjectRef = doc(collection(db, "userSubjects"));
    await setDoc(newSubjectRef, subjectWithUserId);

  } catch (error) {
    console.error("Error adding subject:", error);
    throw error;
  }
}

export async function updateSubject(subject: Subject): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    if (!subject.id) {
      throw new Error("Subject ID is required for update");
    }

    // Note: We are not checking userId here for update, assuming the user has permission based on the ID.
    // In a real-world app, you'd want to verify ownership.

    const subjectRef = doc(db, "userSubjects", subject.id);
    await setDoc(subjectRef, subject, { merge: true }); // Use merge to update existing fields

  } catch (error) {
    console.error("Error updating subject:", error);
    throw error;
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    if (!subjectId) {
      throw new Error("Subject ID is required for deletion");
    }

    // Note: We are not checking userId here for delete, assuming the user has permission based on the ID.
    // In a real-world app, you'd want to verify ownership.

    const subjectRef = doc(db, "userSubjects", subjectId);
    await deleteDoc(subjectRef);

  } catch (error) {
    console.error("Error deleting subject:", error);
    throw error;
  }
}

export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    if (!subjectId) {
      throw new Error("Subject ID is required to fetch a single subject");
    }

    const subjectRef = doc(db, "userSubjects", subjectId);
    const docSnap = await getDoc(subjectRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Subject;
    } else {
      console.warn(`No such document with ID: ${subjectId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching subject by ID:", error);
    throw error;
  }
}