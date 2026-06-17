import type { GitVizObjectType } from "@gitviz/shared";

import { ObjectParseError } from "../errors.js";
import { hashBytes } from "../hash.js";
import type { ObjectId } from "../object-id.js";
import { deserializeBlob, serializeBlob } from "./blob.js";
import { deserializeCommit, serializeCommit } from "./commit.js";
import { deserializeTree, serializeTree } from "./tree.js";
import type { GitVizObject } from "./types.js";

/**
 * Generic, type-dispatching object codec and identity.
 *
 * Each object kind serializes to a "content" buffer (see blob/tree/commit). For
 * hashing and storage, that content is wrapped in a uniform envelope:
 *
 *   `<type> <byteLength>\0<content>`
 *
 * Including the type and length in the hashed bytes means a blob and a tree with
 * coincidentally identical content can never collide, and the length acts as a
 * built-in integrity check. The object id is the SHA-256 of this framed form —
 * exactly the scheme Git uses (with SHA-256 instead of SHA-1).
 */

const NUL = "\0";

/** Serializes any object to its canonical (unframed) content bytes. */
export function serialize(object: GitVizObject): Buffer {
  switch (object.type) {
    case "blob":
      return serializeBlob(object);
    case "tree":
      return serializeTree(object);
    case "commit":
      return serializeCommit(object);
  }
}

/** Reconstructs an object of the given type from its content bytes. */
export function deserialize(type: GitVizObjectType, content: Buffer): GitVizObject {
  switch (type) {
    case "blob":
      return deserializeBlob(content);
    case "tree":
      return deserializeTree(content);
    case "commit":
      return deserializeCommit(content);
    default:
      throw new ObjectParseError(`Unknown object type: ${String(type)}`);
  }
}

/**
 * Wraps content bytes in the canonical `<type> <length>\0<content>` envelope
 * that is hashed and (later) stored.
 */
export function frameObject(type: GitVizObjectType, content: Buffer): Buffer {
  const header = Buffer.from(`${type} ${content.length}${NUL}`, "utf8");
  return Buffer.concat([header, content]);
}

/**
 * Computes the content-addressable {@link ObjectId} of an object: the SHA-256 of
 * its framed serialization. Deterministic — equal objects always hash equally.
 */
export function computeObjectId(object: GitVizObject): ObjectId {
  return hashBytes(frameObject(object.type, serialize(object)));
}
