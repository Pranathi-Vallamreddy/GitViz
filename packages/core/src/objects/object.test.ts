import { describe, expect, it } from "vitest";

import { ObjectParseError } from "../errors.js";
import { createBlob } from "./blob.js";
import { createCommit } from "./commit.js";
import { computeObjectId, deserialize, frameObject, serialize } from "./object.js";
import { createTree } from "./tree.js";
import { hashBytes } from "../hash.js";

const treeHash = hashBytes(Buffer.from("t"));

describe("frameObject", () => {
  it("prepends the '<type> <length>\\0' envelope", () => {
    expect(frameObject("blob", Buffer.from("hello"))).toEqual(
      Buffer.concat([Buffer.from("blob 5\0"), Buffer.from("hello")]),
    );
  });

  it("makes identical content of different types hash differently", () => {
    const content = Buffer.from("ambiguous");
    expect(frameObject("blob", content)).not.toEqual(frameObject("tree", content));
  });
});

describe("serialize / deserialize dispatch", () => {
  it("round-trips a blob", () => {
    const blob = createBlob("data");
    expect(deserialize("blob", serialize(blob))).toEqual(blob);
  });

  it("round-trips a tree", () => {
    const tree = createTree([{ name: "a", type: "blob", hash: treeHash }]);
    expect(deserialize("tree", serialize(tree))).toEqual(tree);
  });

  it("round-trips a commit", () => {
    const commit = createCommit({
      tree: treeHash,
      author: { name: "A", email: "a@b.c" },
      timestamp: 1,
      message: "m",
    });
    expect(deserialize("commit", serialize(commit))).toEqual(commit);
  });

  it("throws on an unknown object type", () => {
    expect(() => deserialize("bogus" as never, Buffer.alloc(0))).toThrow(
      ObjectParseError,
    );
  });
});

describe("computeObjectId", () => {
  it("distinguishes objects of different kinds", () => {
    const blob = createBlob("x");
    const tree = createTree([]);
    expect(computeObjectId(blob)).not.toBe(computeObjectId(tree));
  });
});
