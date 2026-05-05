import test from "node:test";
import assert from "node:assert/strict";

import {
  computeProjectedPercentage,
  getPerUnitScoresForWeightedProjection,
} from "./ap-score-utils";

const macroWeights = {
  BEC: 20,
  EIBC: 20,
  NIPD: 20,
  FS: 20,
  LRCSP: 20,
};

test("unit-only sparse evidence stays below prediction threshold", () => {
  const projected = computeProjectedPercentage({
    unitProgressMap: {
      BEC: { highestScore: 90 },
    },
    testHistory: [],
    unitWeights: macroWeights,
  });

  assert.equal(projected.projectedPercentage, 90);
  assert.equal(projected.hasEnoughForPrediction, false);
});

test("unit-only with enough coverage passes prediction threshold", () => {
  const projected = computeProjectedPercentage({
    unitProgressMap: {
      BEC: { highestScore: 66 },
      EIBC: { highestScore: 66 },
      NIPD: { highestScore: 66 },
    },
    testHistory: [],
    unitWeights: macroWeights,
  });

  assert.equal(projected.projectedPercentage, 66);
  assert.equal(projected.hasEnoughForPrediction, true);
});

test("full-length path uses higher of unit-weighted and full-length-derived values", () => {
  const projected = computeProjectedPercentage({
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
        percentage: 70,
        sectionBreakdown: {
          BEC: { correct: 8, total: 10, percentage: 80 },
          EIBC: { correct: 7, total: 10, percentage: 70 },
          NIPD: { correct: 7, total: 10, percentage: 70 },
        },
      },
    ],
    unitWeights: macroWeights,
  });

  assert.equal(projected.projectedPercentage, 73);
  assert.equal(projected.hasEnoughForPrediction, true);
});

test("per-unit weighted helper does not backfill missing units", () => {
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
