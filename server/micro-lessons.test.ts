import test from "node:test";
import assert from "node:assert/strict";
import {
  microLessonDocId,
  parseGeneratedMicroLesson,
  stripModelJsonObject,
  toMicroLessonRecord,
} from "./micro-lessons";

test("microLessonDocId normalizes codes", () => {
  assert.equal(microLessonDocId("APCHEM", "IMF"), "APCHEM_IMF");
});

test("stripModelJsonObject extracts JSON object", () => {
  const raw = 'Here you go:\n```json\n{"title":"T","estimatedReadMinutes":3,"blocks":[{"body":"x"}]}\n```';
  const stripped = stripModelJsonObject(raw);
  assert.ok(stripped.startsWith("{"));
  assert.ok(stripped.endsWith("}"));
});

test("parseGeneratedMicroLesson accepts valid payload", () => {
  const parsed = parseGeneratedMicroLesson(
    JSON.stringify({
      title: "Intermolecular forces",
      estimatedReadMinutes: 4,
      blocks: [
        { heading: "Big idea", body: "IMFs explain boiling points." },
        { body: "Hydrogen bonding is strongest." },
      ],
    }),
  );
  assert.ok(parsed);
  assert.equal(parsed!.title, "Intermolecular forces");
  assert.equal(parsed!.blocks.length, 2);
  assert.equal(parsed!.estimatedReadMinutes, 4);
});

test("parseGeneratedMicroLesson rejects empty blocks", () => {
  assert.equal(
    parseGeneratedMicroLesson(JSON.stringify({ title: "T", blocks: [] })),
    null,
  );
});

test("toMicroLessonRecord maps firestore document", () => {
  const record = toMicroLessonRecord("APCHEM_IMF", {
    subjectCode: "APCHEM",
    sectionCode: "IMF",
    unitName: "Intermolecular Forces",
    title: "IMF basics",
    blocks: [{ heading: "A", body: "Body" }],
    estimatedReadMinutes: 3,
    status: "published",
    generatedAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  });
  assert.ok(record);
  assert.equal(record!.id, "APCHEM_IMF");
  assert.equal(record!.status, "published");
});
