import { describe, expect, it } from "vitest";

import { hashBytes } from "./hash.js";

describe("hashBytes", () => {
  it("matches the known SHA-256 vector for empty input", () => {
    // Reference value for sha256("") — anchors the algorithm choice.
    expect(hashBytes(Buffer.alloc(0))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("is deterministic: equal bytes hash equally", () => {
    expect(hashBytes(Buffer.from("hello"))).toBe(hashBytes(Buffer.from("hello")));
  });

  it("is sensitive: different bytes hash differently", () => {
    expect(hashBytes(Buffer.from("hello"))).not.toBe(hashBytes(Buffer.from("hellp")));
  });

  it("returns a 64-character lowercase hex digest", () => {
    expect(hashBytes(Buffer.from("anything"))).toMatch(/^[0-9a-f]{64}$/);
  });
});
