import { storage } from "../storage";

export async function trackQuestionForUser(
  userId: string,
  data: {
    questionId: string;
    subjectId: string;
    unitId: string;
    correct: boolean;
    timeSpentSec: number;
    sectionCode?: string;
    prompt?: string;
    choices?: string[];
    answerIndex?: number;
    explanation?: string;
  },
) {
  return storage.trackQuestionPerformance(userId, data);
}

export async function getDueReviewsForUser(
  userId: string,
  subjectId?: string,
  limit?: number,
  unitId?: string,
) {
  return storage.getDueReviews(userId, subjectId, limit, unitId);
}

export async function getQuestionStatsForUser(userId: string, subjectId?: string) {
  return storage.getQuestionStats(userId, subjectId);
}

export async function saveScoreSnapshotForUser(
  userId: string,
  subjectId: string,
  accuracy: number,
  predictedScore: number,
  totalAttempted: number,
) {
  return storage.saveScoreSnapshot(userId, subjectId, accuracy, predictedScore, totalAttempted);
}

export async function backfillScoreSnapshotsForUser(
  userId: string,
  subjectId: string,
  currentAccuracy: number,
  currentPredicted: number,
  totalAttempted: number,
) {
  return storage.backfillScoreSnapshots(userId, subjectId, currentAccuracy, currentPredicted, totalAttempted);
}

