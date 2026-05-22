import test from "node:test";
import assert from "node:assert/strict";
import {
  getMicroDrillCheckpoint,
  getMicroDrillGoalScore,
  MICRO_DRILL_MAX_SESSION_QUESTIONS,
  MICRO_DRILL_ROUND_SIZE,
} from "./micro-drill-checkpoint";

test("getMicroDrillGoalScore maps predicted AP score to goal", () => {
  assert.equal(getMicroDrillGoalScore(3), 4);
  assert.equal(getMicroDrillGoalScore(4), 5);
  assert.equal(getMicroDrillGoalScore(5), 5);
});

test("perfect round recommends end", () => {
  const r = getMicroDrillCheckpoint({
    roundCorrect: 5,
    roundTotal: 5,
    sessionCorrect: 5,
    sessionTotal: 5,
    roundNumber: 1,
    goalScore: 4,
    subjectId: "ap-chem",
  });
  assert.equal(r.recommendation, "end");
  assert.equal(r.roundPct, 100);
});

test("weak round recommends continue", () => {
  const r = getMicroDrillCheckpoint({
    roundCorrect: 1,
    roundTotal: 5,
    sessionCorrect: 1,
    sessionTotal: 5,
    roundNumber: 1,
    goalScore: 4,
    subjectId: "ap-chem",
  });
  assert.equal(r.recommendation, "continue");
  assert.ok(r.canContinue);
});

test("at session cap cannot continue", () => {
  const r = getMicroDrillCheckpoint({
    roundCorrect: 3,
    roundTotal: 5,
    sessionCorrect: 23,
    sessionTotal: MICRO_DRILL_MAX_SESSION_QUESTIONS,
    roundNumber: 5,
    goalScore: 5,
    subjectId: "ap-chem",
  });
  assert.equal(r.atSessionCap, true);
  assert.equal(r.canContinue, false);
  assert.equal(r.recommendation, "end");
});

test("continue blocked when next round would exceed cap", () => {
  const r = getMicroDrillCheckpoint({
    roundCorrect: 4,
    roundTotal: 5,
    sessionCorrect: 22,
    sessionTotal: 22,
    roundNumber: 4,
    goalScore: 4,
    subjectId: "ap-chem",
  });
  assert.equal(r.canContinue, false);
});
