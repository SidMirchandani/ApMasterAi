import test from "node:test";
import assert from "node:assert/strict";
import {
  FAST_PATH_COPY,
  getFastPathHeadline,
  getPrimarySectionTitle,
  getSecondarySectionTitle,
} from "./fast-path-copy";

const score = (n: number) => ({ score: n, color: "#000", label: String(n) });

test("diagnostic CTA uses Fast Path prefix", () => {
  assert.equal(FAST_PATH_COPY.checkMyScore, "Fast Path: Check My Score");
});

test("headline at 5 is Fast Path: Keep Your 5", () => {
  assert.equal(getFastPathHeadline(score(5)), "Fast Path: Keep Your 5");
});

test("headline below 4 is Fast Path: Sprint to 4", () => {
  assert.equal(getFastPathHeadline(score(3)), "Fast Path: Sprint to 4");
});

test("headline at projected 4 is Fast Path: Sprint to 5", () => {
  assert.equal(getFastPathHeadline(score(4)), "Fast Path: Sprint to 5");
});

test("section titles at 5 avoid lock-in wording", () => {
  assert.equal(getPrimarySectionTitle(score(5)), "Priority Practice");
  assert.equal(getSecondarySectionTitle(score(5)), "More Practice");
});

test("section titles below 4 use lock in 4 and 5", () => {
  assert.equal(getPrimarySectionTitle(score(3)), "Lock In Your 4");
  assert.equal(getSecondarySectionTitle(score(3)), "Lock In Your 5");
});

test("at projected 4 primary is lock in 5", () => {
  assert.equal(getPrimarySectionTitle(score(4)), "Lock In Your 5");
  assert.equal(getSecondarySectionTitle(score(4)), "More Practice");
});
