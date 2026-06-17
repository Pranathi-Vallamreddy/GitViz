import { describe, expect, it } from "vitest";

import { InvalidObjectIdError } from "./errors.js";
import { asObjectId, isObjectId } from "./object-id.js";

const VALID = "a".repeat(64);

describe("isObjectId", () => {
  it("accepts a 64-char lowercase hex string", () => {
    expect(isObjectId(VALID)).toBe(true);
  });

  it("rejects wrong length, uppercase, non-hex, and non-strings", () => {
    expect(isObjectId("a".repeat(63))).toBe(false);
    expect(isObjectId("A".repeat(64))).toBe(false);
    expect(isObjectId("g".repeat(64))).toBe(false);
    expect(isObjectId(123)).toBe(false);
    expect(isObjectId(undefined)).toBe(false);
  });
});

describe("asObjectId", () => {
  it("returns the branded id for valid input", () => {
    expect(asObjectId(VALID)).toBe(VALID);
  });

  it("throws InvalidObjectIdError for invalid input", () => {
    expect(() => asObjectId("nope")).toThrow(InvalidObjectIdError);
  });
});
