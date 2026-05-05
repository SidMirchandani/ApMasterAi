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
      FS: { highestScore: 70 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.ok(state.displayScore != null);
  assert.equal(state.reason, "reached_three");
  assert.equal(state.studentScore, 54);
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

test("unit-only all units at 60 percent passes gate", () => {
  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      BEC: { highestScore: 60 },
      EIBC: { highestScore: 60 },
      NIPD: { highestScore: 60 },
      FS: { highestScore: 60 },
      LRCSP: { highestScore: 60 },
    },
    testHistory: [],
    unitWeights: macroWeights,
    subjectCode: "APMACRO",
  });

  assert.equal(state.canShowProjectedScore, true);
  assert.equal(state.reason, "all_units");
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

test("APUSH mixed evidence no longer inflates to a 5", () => {
  const apushWeights = {
    P1: 5.1,
    P2: 7.14,
    P3: 13.78,
    P4: 13.78,
    P5: 13.78,
    P6: 13.78,
    P7: 13.78,
    P8: 13.78,
    P9: 5.1,
  };

  const state = getProjectedAPScoreDisplay({
    unitProgressMap: {
      P1: { highestScore: 33 },
      P2: { highestScore: 67 },
      P5: { highestScore: 100 },
      P6: { highestScore: 67 },
      P9: { highestScore: 79 },
    },
    testHistory: [
      {
        type: "full-length",
        percentage: 49,
        sectionBreakdown: {
          P1: { correct: 1, total: 3, percentage: 33 },
          P2: { correct: 2, total: 3, percentage: 67 },
          P3: { correct: 0, total: 1, percentage: 0 },
          P4: { correct: 0, total: 4, percentage: 0 },
          P5: { correct: 2, total: 2, percentage: 100 },
          P6: { correct: 2, total: 3, percentage: 67 },
          P7: { correct: 0, total: 1, percentage: 0 },
          P8: { correct: 0, total: 3, percentage: 0 },
          P9: { correct: 12, total: 19, percentage: 63 },
        },
      },
    ],
    unitWeights: apushWeights,
    subjectCode: "APUSH",
  });

  assert.equal(state.studentScore, 49);
  assert.equal(state.displayScore, 3);
  assert.equal(state.reason, "full_length");
});
