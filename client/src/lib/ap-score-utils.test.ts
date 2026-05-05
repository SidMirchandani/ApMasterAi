import test from "node:test";
import assert from "node:assert/strict";

import {
  computeProjectedPercentage,
  getPerUnitScoresForWeightedProjection,
  getProjectedAPScoreDisplay,
} from "./ap-score-utils";

const macroWeights = {
  BEC: 20,
  EIBC: 20,
  NIPD: 20,
  FS: 20,
  LRCSP: 20,
};

test("unit-only sparse evidence shows N/A", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 85 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, false);
  assert.equal(state.displayScore, null);
  assert.equal(state.displayLabel, "N/A");
  assert.equal(state.reason, "insufficient_data");
});

test("unit-only sufficient evidence can show projected score", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 70 },
      EIBC: { highestScore: 66 },
      NIPD: { highestScore: 64 },
      FS: { highestScore: 62 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.ok(state.displayScore != null);
  assert.equal(state.reason, "reached_three");
  assert.equal(state.studentScore, 66);
});

test("full-length only uses derived section-weighted score", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {},
    testHistory: [
      {
        type: "full-length",
        percentage: 68,
        sectionBreakdown: {
          BEC: { correct: 8, total: 10, percentage: 80 },
          EIBC: { correct: 6, total: 10, percentage: 60 },
        },
      },
    ],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.equal(state.reason, "full_length");
  assert.equal(state.studentScore, 70);
});

test("full-length plus explicit unit data uses higher signal", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 62 },
      EIBC: { highestScore: 62 },
      NIPD: { highestScore: 62 },
      FS: { highestScore: 62 },
      LRCSP: { highestScore: 62 },
    },
    testHistory: [
      {
        type: "full-length",
        percentage: 74,
        sectionBreakdown: {
          BEC: { correct: 8, total: 10, percentage: 80 },
          EIBC: { correct: 7, total: 10, percentage: 70 },
          NIPD: { correct: 7, total: 10, percentage: 70 },
        },
      },
    ],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.equal(state.reason, "full_length");
  assert.equal(state.studentScore, 73);
});

test("unit-only exactly 3 units and 60 percent passes gate", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 60 },
      EIBC: { highestScore: 60 },
      NIPD: { highestScore: 60 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.equal(state.reason, "reached_three");
  assert.equal(state.studentScore, 60);
  assert.ok(state.displayScore != null);
});

test("unit-only 3 units but below AP3 threshold stays N/A", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 50 },
      EIBC: { highestScore: 50 },
      NIPD: { highestScore: 50 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, false);
  assert.equal(state.reason, "insufficient_data");
  assert.equal(state.displayScore, null);
});

test("unit-only under coverage threshold stays N/A even with high marks", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 95 },
      EIBC: { highestScore: 95 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, false);
  assert.equal(state.reason, "insufficient_data");
  assert.equal(state.displayScore, null);
});

test("full-length with low score still shows projected score (not N/A)", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {},
    testHistory: [
      {
        type: "full-length",
        percentage: 35,
        sectionBreakdown: {
          BEC: { correct: 3, total: 10, percentage: 30 },
          EIBC: { correct: 4, total: 10, percentage: 40 },
        },
      },
    ],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.equal(state.reason, "full_length");
  assert.equal(state.studentScore, 35);
  assert.ok(state.displayScore != null);
});

test("higher-of rule picks explicit unit score when stronger than full-length derived", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 82 },
      EIBC: { highestScore: 82 },
      NIPD: { highestScore: 82 },
      FS: { highestScore: 82 },
      LRCSP: { highestScore: 82 },
    },
    testHistory: [
      {
        type: "full-length",
        percentage: 65,
        sectionBreakdown: {
          BEC: { correct: 6, total: 10, percentage: 60 },
          EIBC: { correct: 7, total: 10, percentage: 70 },
        },
      },
    ],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.studentScore, 82);
  assert.equal(state.reason, "full_length");
});

test("weighted per-unit helper does not backfill missing units from whole-test score", () => {
  const perUnit = getPerUnitScoresForWeightedProjection({
    unitProgressMap: {
      BEC: { highestScore: 75 },
    },
    testHistory: [
      {
        type: "full-length",
        percentage: 92,
        sectionBreakdown: {
          BEC: { correct: 8, total: 10, percentage: 80 },
        },
      },
    ],
    unitWeights: macroWeights,
  });

  assert.equal(perUnit.BEC, 80);
  assert.equal(perUnit.EIBC, 0);
  assert.equal(perUnit.NIPD, 0);
  assert.equal(perUnit.FS, 0);
  assert.equal(perUnit.LRCSP, 0);
});

test("computeProjectedPercentage uses higher of weighted units and full-length derived", () => {
  const projected = computeProjectedPercentage({
    unitProgressMap: {
      BEC: { highestScore: 66 },
      EIBC: { highestScore: 66 },
      NIPD: { highestScore: 66 },
      FS: { highestScore: 66 },
      LRCSP: { highestScore: 66 },
    },
    testHistory: [
      {
        type: "full-length",
        percentage: 72,
        sectionBreakdown: {
          BEC: { correct: 8, total: 10, percentage: 80 },
          EIBC: { correct: 7, total: 10, percentage: 70 },
        },
      },
    ],
    unitWeights: macroWeights,
  });

  assert.equal(projected.projectedPercentage, 75);
  assert.equal(projected.hasEnoughForPrediction, true);
});

test("computeProjectedPercentage returns zero when no evidence exists", () => {
  const projected = computeProjectedPercentage({
    unitProgressMap: {},
    testHistory: [],
    unitWeights: macroWeights,
  });

  assert.equal(projected.projectedPercentage, 0);
  assert.equal(projected.hasEnoughForPrediction, false);
});
