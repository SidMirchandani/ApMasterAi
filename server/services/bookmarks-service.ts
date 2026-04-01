import { storage } from "../storage";

export async function toggleBookmarkForUser(
  userId: string,
  questionData: {
    questionId: string;
    subjectId: string;
    unitId: string;
    prompt: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
    sectionCode?: string;
  },
) {
  return storage.toggleBookmark(userId, questionData);
}

export async function listBookmarksForUser(
  userId: string,
  subjectId?: string,
  unitId?: string,
) {
  return storage.getBookmarks(userId, subjectId, unitId);
}

export async function listBookmarkIdsForUser(userId: string, subjectId?: string) {
  return storage.getBookmarkedQuestionIds(userId, subjectId);
}

