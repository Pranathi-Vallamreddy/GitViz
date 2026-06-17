import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createBlob, deserializeBlob, serializeBlob } from "./blob.js";
import { computeObjectId } from "./object.js";

describe("blob", () => {
  it("creates a blob from a string and from a Buffer", () => {
    expect(createBlob("hi").data).toEqual(Buffer.from("hi"));
    expect(createBlob(Buffer.from([1, 2, 3])).data).toEqual(Buffer.from([1, 2, 3]));
  });

  it("round-trips arbitrary bytes through serialize/deserialize", () => {
    const data = Buffer.from([0, 1, 2, 255, 254, 0, 10]);
    const restored = deserializeBlob(serializeBlob(createBlob(data)));
    expect(restored).toEqual(createBlob(data));
  });

  it("deduplicates: identical content yields the same id", () => {
    expect(computeObjectId(createBlob("same"))).toBe(computeObjectId(createBlob("same")));
  });

  it("computes the SHA-256 of the framed object", () => {
    const blob = createBlob("hello");
    const framed = Buffer.concat([Buffer.from("blob 5\0"), Buffer.from("hello")]);
    const expected = createHash("sha256").update(framed).digest("hex");
    expect(computeObjectId(blob)).toBe(expected);
  });
});
