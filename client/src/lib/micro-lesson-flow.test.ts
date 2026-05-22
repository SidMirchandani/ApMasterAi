import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMicroLessonPath,
  buildMicroLessonQuizUrl,
  shouldRouteThroughMicroLesson,
  MICRO_DRILL_ROUND_SIZE,
} from "./micro-lesson-flow";

test("buildMicroLessonPath omits primer by default (Khan: lesson is teach step)", () => {
  const path = buildMicroLessonPath({
    subjectId: "ap-chem",
    sectionCode: "IMF",
    unitId: "unit3",
    from: "fast-path",
    goal: 5,
  });
  assert.ok(path.includes("/micro-lesson?"));
  assert.ok(path.includes("goal=5"));
  assert.ok(!path.includes("primer=1"));
});

test("buildMicroLessonPath includes primer when explicitly enabled", () => {
  const path = buildMicroLessonPath({
    subjectId: "ap-chem",
    sectionCode: "IMF",
    unitId: "unit3",
    primer: true,
  });
  assert.ok(path.includes("primer=1"));
});

test("buildMicroLessonQuizUrl uses micro-drill mode and 5 questions without primer by default", () => {
  const url = buildMicroLessonQuizUrl({
    subjectId: "ap-chem",
    unitId: "unit3",
    goal: 4,
    from: "fast-path",
  });
  assert.ok(url.includes("mode=micro-drill"));
  assert.ok(url.includes(`limit=${MICRO_DRILL_ROUND_SIZE}`));
  assert.ok(url.includes("goal=4"));
  assert.ok(url.includes("from=fast-path"));
  assert.ok(!url.includes("primer=1"));
});

test("buildMicroLessonQuizUrl can enable primer", () => {
  const url = buildMicroLessonQuizUrl({
    subjectId: "ap-chem",
    unitId: "unit3",
    primer: true,
  });
  assert.ok(url.includes("primer=1"));
});

test("shouldRouteThroughMicroLesson skips refreshers", () => {
  assert.equal(
    shouldRouteThroughMicroLesson({ isRefresher: true, hasPublishedLesson: true }),
    false,
  );
  assert.equal(
    shouldRouteThroughMicroLesson({ isRefresher: false, hasPublishedLesson: true }),
    true,
  );
});
