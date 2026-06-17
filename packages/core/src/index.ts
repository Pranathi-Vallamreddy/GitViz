/**
 * @gitviz/core — the GitViz version-control engine.
 *
 * This package owns the data structures and algorithms that make GitViz a real
 * version control system rather than a file-copy tool:
 *
 *   - a content-addressable object store (blob / tree / commit, keyed by hash)
 *   - the commit DAG and its traversal (log, ancestry)
 *   - refs and HEAD (branches, checkout)
 *   - tree and line-level diff
 *
 * It deliberately depends on no web or server framework so it can be unit-tested
 * in isolation and driven equally by the CLI and the HTTP API.
 *
 * Phase 0: intentionally empty aside from a version marker. Implementation
 * begins in Phase 1.
 */

import type { GitVizObjectType } from "@gitviz/shared";
import { GITVIZ_VERSION } from "@gitviz/shared";

/** Engine version, re-exported for consumers that only depend on core. */
export const CORE_VERSION = GITVIZ_VERSION;

export type { GitVizObjectType };
