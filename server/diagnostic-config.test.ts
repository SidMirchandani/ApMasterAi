import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIAGNOSTIC_UNIT_DISTRIBUTIONS,
  getDiagnosticDistributionForSubject,
  getDiagnostic35Distribution,
  getDiagnosticPoolCaps,
} from "./ap-subject-config";
import { SUBJECT_SECTION_CODES } from "./subject-sections";

function sumValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((acc, v) => acc + v, 0);
}

describe("ap-subject-config diagnostic helpers", () => {
  it("DIAGNOSTIC_UNIT_DISTRIBUTIONS sums to 25 where defined", () => {
    for (const [subject, dist] of Object.entries(DIAGNOSTIC_UNIT_DISTRIBUTIONS)) {
      assert.equal(sumValues(dist), 25, `distribution for ${subject} should sum to 25`);
    }
  });

  it("getDiagnosticDistributionForSubject falls back to 25-question total", () => {
    const subject = "APMACRO";
    const dist = getDiagnosticDistributionForSubject(subject);
    assert.ok(dist, "distribution should be defined");
    assert.equal(sumValues(dist!), 25);
  });

  it("getDiagnostic35Distribution returns 35-question totals", () => {
    const subject = "APMICRO";
    const dist = getDiagnostic35Distribution(subject);
    assert.ok(dist, "35 distribution should be defined");
    assert.equal(sumValues(dist!), 35);
  });

  it("per-subject diagnostic maps use canonical section codes when available", () => {
    const subjectsToCheck = ["APMACRO", "APMICRO", "APCSP", "APCHEM"];
    for (const subject of subjectsToCheck) {
      const canonical = SUBJECT_SECTION_CODES[subject];
      if (!canonical) continue;
      const caps = getDiagnosticPoolCaps(subject);
      assert.ok(caps, `pool caps should exist for ${subject}`);
      const keys = Object.keys(caps!);
      assert.deepEqual(
        keys.sort(),
        [...canonical].sort(),
        `pool caps keys for ${subject} should match canonical section codes`,
      );
    }
  });
});

