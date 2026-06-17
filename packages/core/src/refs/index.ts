/**
 * Refs and HEAD: named pointers into the commit DAG. Branches live under
 * `refs/heads/`, and HEAD is a symbolic ref naming the current branch (or a
 * direct ref when detached).
 */

export type { Ref } from "./ref.js";
export { directRef, parseRef, serializeRef, symbolicRef } from "./ref.js";
export {
  assertValidBranchName,
  assertValidRefName,
  branchNameReason,
  branchRefName,
  DEFAULT_BRANCH,
  HEAD,
  HEADS_PREFIX,
  isValidBranchName,
  isValidRefName,
} from "./ref-name.js";
export type { RefStore } from "./ref-store.js";
export { FileSystemRefStore } from "./fs-ref-store.js";
