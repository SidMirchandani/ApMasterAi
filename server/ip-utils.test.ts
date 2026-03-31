import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNonPublicIp, normalizeIpForGeo } from "./ip-utils";

describe("ip-utils", () => {
  it("normalizes IPv4-mapped IPv6", () => {
    assert.equal(normalizeIpForGeo("::ffff:8.8.8.8"), "8.8.8.8");
  });

  it("treats public IPv4 as public", () => {
    assert.equal(isNonPublicIp("8.8.8.8"), false);
  });

  it("treats loopback as non-public", () => {
    assert.equal(isNonPublicIp("127.0.0.1"), true);
    assert.equal(isNonPublicIp("::1"), true);
  });

  it("treats RFC1918 as non-public", () => {
    assert.equal(isNonPublicIp("10.0.0.1"), true);
    assert.equal(isNonPublicIp("192.168.1.1"), true);
  });
});
