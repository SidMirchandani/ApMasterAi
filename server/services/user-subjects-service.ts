import { storage, UserSubject } from "../storage";

export async function getUserSubjectsForUser(userId: string): Promise<UserSubject[]> {
  return storage.getUserSubjects(userId);
}

export async function hasUserSubjectForUser(userId: string, subjectId: string): Promise<boolean> {
  return storage.hasUserSubject(userId, subjectId);
}

export async function addUserSubjectForUser(
  subject: Omit<UserSubject, "id" | "dateAdded" | "unitProgress">,
): Promise<UserSubject> {
  return storage.addUserSubject(subject);
}

export async function removeUserSubjectForUser(userId: string, subjectId: string): Promise<void> {
  // Express route previously called a non-existent removeUserSubject(userId, subjectId).
  // Delegate to deleteUserSubject using the subject document id.
  // Callers are responsible for passing the user_subjects document id here.
  return storage.deleteUserSubject(subjectId);
}

export async function updateSubjectMasteryLevelForUser(
  userId: string,
  subjectId: string,
  masteryLevel: number,
): Promise<any> {
  return storage.updateSubjectMasteryLevel(userId, subjectId, masteryLevel);
}

export async function updateUnitProgressForUser(
  userId: string,
  subjectId: string,
  unitId: string,
  mcqScore: number,
): Promise<any> {
  return storage.updateUnitProgress(userId, subjectId, unitId, mcqScore);
}

