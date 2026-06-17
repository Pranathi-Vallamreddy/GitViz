import { describe, expect, it } from "vitest";

import { InvalidObjectError, ObjectParseError } from "../errors.js";
import { hashBytes } from "../hash.js";
import { createCommit, deserializeCommit, serializeCommit } from "./commit.js";
import { computeObjectId } from "./object.js";

const treeHash = hashBytes(Buffer.from("root-tree"));
const parentHash = hashBytes(Buffer.from("parent-commit"));
const author = { name: "Ada Lovelace", email: "ada@example.com" };
const timestamp = 1_700_000_000_000;

const base = { tree: treeHash, author, timestamp, message: "Initial commit" };

describe("createCommit", () => {
  it("creates a root commit with no parents", () => {
    expect(createCommit(base).parents).toEqual([]);
  });

  it("rejects a non-integer timestamp", () => {
    expect(() => createCommit({ ...base, timestamp: 1.5 })).toThrow(InvalidObjectError);
  });

  it("rejects an author name containing '<'", () => {
    expect(() =>
      createCommit({ ...base, author: { name: "a<b", email: "x@y.z" } }),
    ).toThrow(InvalidObjectError);
  });
});

describe("commit serialization", () => {
  it("round-trips a root commit", () => {
    const commit = createCommit(base);
    expect(deserializeCommit(serializeCommit(commit))).toEqual(commit);
  });

  it("round-trips a commit with multiple parents in order", () => {
    const other = hashBytes(Buffer.from("other-parent"));
    const commit = createCommit({ ...base, parents: [parentHash, other] });
    const restored = deserializeCommit(serializeCommit(commit));
    expect(restored).toEqual(commit);
    expect(restored.parents).toEqual([parentHash, other]);
  });

  it("round-trips a multi-line message with blank lines", () => {
    const message = "Subject line\n\nBody paragraph.\n\nAnother paragraph.\n";
    const commit = createCommit({ ...base, message });
    expect(deserializeCommit(serializeCommit(commit)).message).toBe(message);
  });

  it("is deterministic: equal commits hash equally", () => {
    expect(computeObjectId(createCommit(base))).toBe(computeObjectId(createCommit(base)));
  });

  it("changes id when a parent changes (DAG identity)", () => {
    const a = createCommit(base);
    const b = createCommit({ ...base, parents: [parentHash] });
    expect(computeObjectId(a)).not.toBe(computeObjectId(b));
  });

  it("throws on a malformed header line", () => {
    expect(() => deserializeCommit(Buffer.from("garbage\n\nmsg"))).toThrow(
      ObjectParseError,
    );
  });
});
