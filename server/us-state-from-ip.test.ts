import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupUsStateFromIpWithReason } from "./us-state-from-ip";

describe("us-state-from-ip (Vercel headers)", () => {
  it("uses x-vercel-ip-country-region when country is US", () => {
    const r = lookupUsStateFromIpWithReason(null, {
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "IL",
    });
    assert.equal(r.state, "IL");
    assert.equal(r.reason, "success");
    assert.equal(r.inferenceSource, "vercel_geo");
  });

  it("accepts US-NY style region", () => {
    const r = lookupUsStateFromIpWithReason(null, {
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "US-NY",
    });
    assert.equal(r.state, "NY");
  });

  it("does not treat non-US Vercel country as US state (skips ENG region)", () => {
    const r = lookupUsStateFromIpWithReason("8.8.8.8", {
      "x-vercel-ip-country": "GB",
      "x-vercel-ip-country-region": "ENG",
    });
    assert.notEqual(r.state, "EN");
    assert.notEqual(r.state, "ENG");
  });
});
