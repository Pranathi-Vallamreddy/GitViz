/**
 * High-level repository operations: snapshotting the working tree (`writeTree`),
 * recording commits, and walking history (`log`). This is the façade the CLI and
 * server build on.
 */

export { GITVIZ_DIR_NAME, Repository } from "./repository.js";
export type {
  CheckoutOptions,
  CheckoutResult,
  CommitLogEntry,
  HeadState,
  RepoGraph,
  RepoGraphRef,
  RepoOverview,
} from "./repository.js";
