import { InvalidRefNameError } from "../errors.js";

/**
 * Reference-name validation, a pragmatic subset of Git's `check-ref-format`
 * rules. Validating names before they touch the filesystem prevents path
 * traversal (e.g. `../../etc`) and keeps refs portable.
 */

/** The prefix under which branch refs live. */
export const HEADS_PREFIX = "refs/heads/";

/** The special name of the HEAD ref. */
export const HEAD = "HEAD";

/** The default branch created for a new repository. */
export const DEFAULT_BRANCH = "main";

/** Characters that may never appear in a ref segment (plus control chars). */
const FORBIDDEN_CHARS = new Set([..."~^:?*[\\ "]);

function segmentReason(segment: string): string | undefined {
  if (segment.length === 0) return "empty path segment";
  if (segment.startsWith(".")) return "segment starts with '.'";
  if (segment.endsWith(".")) return "segment ends with '.'";
  if (segment.endsWith(".lock")) return "segment ends with '.lock'";
  for (const ch of segment) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return "contains a control character or space";
    if (FORBIDDEN_CHARS.has(ch)) return `contains forbidden character '${ch}'`;
  }
  return undefined;
}

/** Returns a human-readable reason a branch name is invalid, or undefined if valid. */
export function branchNameReason(name: string): string | undefined {
  if (name.length === 0) return "name is empty";
  if (name.startsWith("/") || name.endsWith("/")) return "name starts or ends with '/'";
  if (name.includes("//")) return "name contains '//'";
  if (name.startsWith("-")) return "name starts with '-'";
  if (name.includes("..")) return "name contains '..'";
  if (name.includes("@{")) return "name contains '@{'";
  for (const segment of name.split("/")) {
    const reason = segmentReason(segment);
    if (reason) return reason;
  }
  return undefined;
}

/** Type guard: `true` when `name` is a valid branch name. */
export function isValidBranchName(name: string): boolean {
  return branchNameReason(name) === undefined;
}

/** Validates a branch name, throwing {@link InvalidRefNameError} if invalid. */
export function assertValidBranchName(name: string): void {
  const reason = branchNameReason(name);
  if (reason) throw new InvalidRefNameError(name, reason);
}

/** Type guard: `true` when `name` is a valid full ref name (HEAD or refs/…). */
export function isValidRefName(name: string): boolean {
  if (name === HEAD) return true;
  if (!name.startsWith("refs/")) return false;
  return isValidBranchName(name.slice("refs/".length));
}

/** Validates a full ref name, throwing {@link InvalidRefNameError} if invalid. */
export function assertValidRefName(name: string): void {
  if (!isValidRefName(name)) {
    throw new InvalidRefNameError(name, "must be 'HEAD' or a well-formed 'refs/…' name");
  }
}

/** Builds the full ref name for a branch: `refs/heads/<branch>`. */
export function branchRefName(branch: string): string {
  return `${HEADS_PREFIX}${branch}`;
}
