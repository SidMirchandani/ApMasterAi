import test from "node:test";
import assert from "node:assert/strict";
import { computeFastPathPlan, getFastPathSummary } from "./fast-path-plan";

test("getFastPathSummary diagnostic when no diagnostic test", () => {
  const plan = computeFastPathPlan({
    subjectId: "ap-chem",
    subjectCode: "APCHEM",
    unitProgressMap: {},
    testHistory: [],
    unitDifficultiesMap: {},
  });
  const summary = getFastPathSummary(plan, "ap-chem");
  assert.equal(summary.variant, "diagnostic");
  assert.equal(summary.headline, "Fast Path: Check My Score");
});

test("getFastPathSummary at score 5 uses Fast Path: Lock In Your 5", () => {
  const plan = computeFastPathPlan({
    subjectId: "ap-chem",
    subjectCode: "APCHEM",
    unitProgressMap: {},
    testHistory: [
      { percentage: 90, type: "diagnostic" },
      { percentage: 90, type: "full-length" },
    ],
    unitDifficultiesMap: {},
  });
  if (plan.predicted && plan.predicted.score >= 5) {
    const summary = getFastPathSummary(plan, "ap-chem");
    assert.equal(summary.headline, "Fast Path: Lock In Your 5");
    assert.equal(summary.variant, "ready");
  }
});
