
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Subject {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
  mastery?: number;
}

export interface MasteryData {
  subjectId: string;
  userId: string;
  level: number;
  totalQuestions: number;
  correctAnswers: number;
  lastUpdated: any;
}

// Get all subjects for a user
export async function getSubjects(userId: string): Promise<Subject[]> {
  const subjectsRef = collection(db, "userSubjects");
  const q = query(
    subjectsRef,
    where("userId", "==", userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Subject[];
}

// Get a single subject
export async function getSubject(subjectId: string): Promise<Subject | null> {
  const subjectDoc = await getDoc(doc(db, "userSubjects", subjectId));
  if (!subjectDoc.exists()) return null;
  
  return {
    id: subjectDoc.id,
    ...subjectDoc.data()
  } as Subject;
}

// Add a new subject
export async function addSubject(userId: string, name: string, description?: string): Promise<string> {
  const subjectsRef = collection(db, "userSubjects");
  const docRef = await addDoc(subjectsRef, {
    name,
    description,
    userId,
    dateAdded: new Date().toISOString(),
  });
  
  return docRef.id;
}

// Update a subject
export async function updateSubject(subjectId: string, updates: Partial<Subject>): Promise<void> {
  const subjectRef = doc(db, "userSubjects", subjectId);
  await updateDoc(subjectRef, {
    ...updates,
  });
}

// Remove a subject
export async function removeSubject(subjectId: string): Promise<void> {
  const subjectRef = doc(db, "userSubjects", subjectId);
  await deleteDoc(subjectRef);
}

// Get mastery data for a subject
export async function getMastery(userId: string, subjectId: string): Promise<MasteryData | null> {
  const masteryRef = collection(db, "mastery");
  const q = query(
    masteryRef,
    where("userId", "==", userId),
    where("subjectId", "==", subjectId)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as MasteryData;
}

// Update mastery data
export async function updateMastery(
  userId: string,
  subjectId: string,
  correctAnswers: number,
  totalQuestions: number
): Promise<void> {
  const masteryRef = collection(db, "mastery");
  const q = query(
    masteryRef,
    where("userId", "==", userId),
    where("subjectId", "==", subjectId)
  );
  
  const querySnapshot = await getDocs(q);
  const level = Math.floor((correctAnswers / totalQuestions) * 100);
  
  if (querySnapshot.empty) {
    // Create new mastery record
    await addDoc(masteryRef, {
      userId,
      subjectId,
      level,
      totalQuestions,
      correctAnswers,
      lastUpdated: serverTimestamp(),
    });
  } else {
    // Update existing mastery record
    const masteryDoc = querySnapshot.docs[0];
    await updateDoc(masteryDoc.ref, {
      level,
      totalQuestions,
      correctAnswers,
      lastUpdated: serverTimestamp(),
    });
  }
}
