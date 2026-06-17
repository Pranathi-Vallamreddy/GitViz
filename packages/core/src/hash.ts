import { createHash } from "node:crypto";

import { asObjectId, type ObjectId } from "./object-id.js";

/**
 * SHA-256 hashing utilities.
 *
 * GitViz is *content-addressable*: an object's identity is the hash of its
 * bytes, so identical content always yields the same id (enabling natural
 * deduplication) and any change to content changes the id.
 */

/** The hashing algorithm used throughout the engine. */
export const HASH_ALGORITHM = "sha256" as const;

/**
 * Computes the SHA-256 of the given bytes and returns it as a branded
 * {@link ObjectId} (lowercase hex).
 */
export function hashBytes(bytes: Buffer): ObjectId {
  const digest = createHash(HASH_ALGORITHM).update(bytes).digest("hex");
  return asObjectId(digest);
}
