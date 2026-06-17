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
const SPACE_BYTE = 0x20;
const NUL_BYTE = 0x00;

const OBJECT_TYPES = ["blob", "tree", "commit"] as const;

/** Type guard for the set of known object types. */
export function isGitVizObjectType(value: string): value is GitVizObjectType {
  return (OBJECT_TYPES as readonly string[]).includes(value);
}

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
 * Splits framed bytes back into their `{ type, content }` parts — the inverse of
 * {@link frameObject}. The header is `<type> <length>\0`; the first space and the
 * first NUL delimit it (neither can appear in the ascii type token or the decimal
 * length), and the declared length is checked against the remaining bytes.
 *
 * @throws {ObjectParseError} if the header is malformed, the type is unknown, or
 *   the declared length does not match the content.
 */
export function parseFrame(framed: Buffer): {
  type: GitVizObjectType;
  content: Buffer;
} {
  const spaceIdx = framed.indexOf(SPACE_BYTE);
  const nulIdx = framed.indexOf(NUL_BYTE);
  if (spaceIdx === -1 || nulIdx === -1 || nulIdx < spaceIdx) {
    throw new ObjectParseError("Malformed object: missing or invalid header");
  }

  const type = framed.toString("utf8", 0, spaceIdx);
  if (!isGitVizObjectType(type)) {
    throw new ObjectParseError(`Malformed object: unknown type "${type}"`);
  }

  const lengthText = framed.toString("utf8", spaceIdx + 1, nulIdx);
  const declaredLength = Number(lengthText);
  if (!Number.isInteger(declaredLength) || String(declaredLength) !== lengthText) {
    throw new ObjectParseError(`Malformed object: bad length "${lengthText}"`);
  }

  const content = framed.subarray(nulIdx + 1);
  if (content.length !== declaredLength) {
    throw new ObjectParseError(
      `Malformed object: declared length ${declaredLength} != actual ${content.length}`,
    );
  }

  return { type, content };
}

/** Decodes framed bytes into a structured object — `parseFrame` + `deserialize`. */
export function decodeObject(framed: Buffer): GitVizObject {
  const { type, content } = parseFrame(framed);
  return deserialize(type, content);
}

/**
 * Computes the content-addressable {@link ObjectId} of an object: the SHA-256 of
 * its framed serialization. Deterministic — equal objects always hash equally.
 */
export function computeObjectId(object: GitVizObject): ObjectId {
  return hashBytes(frameObject(object.type, serialize(object)));
}
