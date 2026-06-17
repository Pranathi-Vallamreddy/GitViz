/**
 * @gitviz/core — the GitViz version-control engine.
 *
 * This package owns the data structures and algorithms that make GitViz a real
 * version control system rather than a file-copy tool. Phase 1 delivers the
 * foundation: the **object model**.
 *
 *   - blob / tree / commit objects (a Merkle DAG of content-addressed objects)
 *   - SHA-256 hashing and content-addressable identity
 *   - deterministic serialization / deserialization
 *
 * Still to come: an object store, refs/HEAD, history traversal, diff. The model
 * deliberately depends on no web or server framework so it can be unit-tested in
 * isolation and driven equally by the CLI and the HTTP API.
 */

import { GITVIZ_VERSION } from "@gitviz/shared";

/** Engine version, re-exported for consumers that only depend on core. */
export const CORE_VERSION = GITVIZ_VERSION;

// --- Object model ---
export * from "./objects/index.js";

// --- Hashing & identity ---
export { hashBytes, HASH_ALGORITHM } from "./hash.js";
export { asObjectId, isObjectId, OBJECT_ID_LENGTH, type ObjectId } from "./object-id.js";

// --- Errors ---
export {
  GitVizError,
  InvalidObjectError,
  InvalidObjectIdError,
  ObjectParseError,
} from "./errors.js";
