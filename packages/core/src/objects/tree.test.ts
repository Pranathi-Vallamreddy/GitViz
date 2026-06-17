import { describe, expect, it } from "vitest";

import { InvalidObjectError, ObjectParseError } from "../errors.js";
import { hashBytes } from "../hash.js";
import { computeObjectId } from "./object.js";
import { createTree, deserializeTree, serializeTree } from "./tree.js";
import type { TreeEntry } from "./types.js";

const blobHash = hashBytes(Buffer.from("file-contents"));
const treeHash = hashBytes(Buffer.from("subdir"));

const entry = (name: string, type: TreeEntry["type"], hash = blobHash): TreeEntry => ({
  name,
  type,
  hash,
});

describe("createTree", () => {
  it("sorts entries by name canonically", () => {
    const tree = createTree([
      entry("c.txt", "blob"),
      entry("a.txt", "blob"),
      entry("b", "tree", treeHash),
    ]);
    expect(tree.entries.map((e) => e.name)).toEqual(["a.txt", "b", "c.txt"]);
  });

  it("rejects duplicate names", () => {
    expect(() => createTree([entry("dup", "blob"), entry("dup", "blob")])).toThrow(
      InvalidObjectError,
    );
  });

  it("rejects names containing a path separator", () => {
    expect(() => createTree([entry("a/b", "blob")])).toThrow(InvalidObjectError);
  });
});

describe("tree serialization", () => {
  it("round-trips through serialize/deserialize", () => {
    const tree = createTree([entry("readme.md", "blob"), entry("src", "tree", treeHash)]);
    expect(deserializeTree(serializeTree(tree))).toEqual(tree);
  });

  it("round-trips an empty tree", () => {
    const tree = createTree([]);
    expect(serializeTree(tree)).toEqual(Buffer.alloc(0));
    expect(deserializeTree(Buffer.alloc(0))).toEqual(tree);
  });

  it("round-trips names containing spaces", () => {
    const tree = createTree([entry("my file.txt", "blob")]);
    expect(deserializeTree(serializeTree(tree))).toEqual(tree);
  });

  it("is deterministic regardless of input order (same id)", () => {
    const a = createTree([entry("x", "blob"), entry("y", "tree", treeHash)]);
    const b = createTree([entry("y", "tree", treeHash), entry("x", "blob")]);
    expect(serializeTree(a)).toEqual(serializeTree(b));
    expect(computeObjectId(a)).toBe(computeObjectId(b));
  });

  it("throws on truncated input", () => {
    const truncated = serializeTree(createTree([entry("a", "blob")])).subarray(0, 10);
    expect(() => deserializeTree(truncated)).toThrow(ObjectParseError);
  });
});
