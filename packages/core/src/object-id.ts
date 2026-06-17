import { InvalidObjectIdError } from "./errors.js";

/**
 * A content-addressable object identifier: the lowercase hex encoding of a
 * SHA-256 digest (64 characters).
 *
 * It is a *branded* string — structurally a `string`, but the brand prevents an
 * arbitrary string from being passed where an id is expected without first going
 * through {@link asObjectId} (or being produced by the hashing layer). This
 * catches "I passed a filename where a hash was expected" bugs at compile time.
 */
export type ObjectId = string & { readonly __brand: "ObjectId" };

/** Number of hex characters in a SHA-256 object id. */
export const OBJECT_ID_LENGTH = 64;

const OBJECT_ID_PATTERN = /^[0-9a-f]{64}$/;

/** Type guard: `true` when `value` is a well-formed object id. */
export function isObjectId(value: unknown): value is ObjectId {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/**
 * Validates and brands a string as an {@link ObjectId}.
 *
 * @throws {InvalidObjectIdError} if the string is not a 64-char lowercase hex digest.
 */
export function asObjectId(value: string): ObjectId {
  if (!isObjectId(value)) {
    throw new InvalidObjectIdError(value);
  }
  return value;
}
