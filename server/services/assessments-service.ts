import { storage } from "../storage";

export async function saveFullLengthTestForUser(
  userId: string,
  subjectId: string,
  score: number,
  percentage: number,
  totalQuestions: number,
  questions: any[],
  userAnswers: { [key: number]: string },
) {
  return storage.saveFullLengthTest(userId, subjectId, score, percentage, totalQuestions, questions, userAnswers);
}

export async function saveDiagnosticTestForUser(
  userId: string,
  subjectId: string,
  score: number,
  percentage: number,
  totalQuestions: number,
  questions: any[],
  userAnswers: { [key: number]: string },
  sectionBreakdown: {
    [key: string]: { name: string; unitNumber: number; correct: number; total: number; percentage: number };
  },
  projectedScore: number,
) {
  return storage.saveDiagnosticTest(
    userId,
    subjectId,
    score,
    percentage,
    totalQuestions,
    questions,
    userAnswers,
    sectionBreakdown,
    projectedScore,
  );
}

