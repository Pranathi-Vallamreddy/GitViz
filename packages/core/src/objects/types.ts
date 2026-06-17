import type { GitVizObjectType } from "@gitviz/shared";

import type { ObjectId } from "../object-id.js";

/**
 * The three object kinds that make up the GitViz object model. Together they
 * form a Merkle DAG: commits point to a tree and to parent commits, trees point
 * to blobs and sub-trees, all by content hash.
 */

/**
 * A blob stores the raw contents of a single file. It carries no name — names
 * live in the referencing {@link Tree} entry — so identical file contents under
 * different names share one blob.
 */
export interface Blob {
  readonly type: "blob";
  readonly data: Buffer;
}

/** The kind of object a {@link TreeEntry} points at. */
export type TreeEntryType = "blob" | "tree";

/**
 * A single entry in a {@link Tree}: a name bound to the hash of a child object
 * (a blob for a file, a tree for a sub-directory).
 */
export interface TreeEntry {
  /** Entry name (a single path segment; never contains "/" or a NUL byte). */
  readonly name: string;
  /** Whether the entry references a file (blob) or directory (tree). */
  readonly type: TreeEntryType;
  /** Content hash of the referenced object. */
  readonly hash: ObjectId;
}

/**
 * A tree represents one directory: an ordered, de-duplicated set of entries.
 * Entries are kept sorted by name so serialization is deterministic and two
 * directories with the same contents hash identically.
 */
export interface Tree {
  readonly type: "tree";
  readonly entries: readonly TreeEntry[];
}

/** Authorship information attached to a {@link Commit}. */
export interface Author {
  /** Display name. Must not contain "<" or a newline. */
  readonly name: string;
  /** Email address. Must not contain ">" or a newline. */
  readonly email: string;
}

/**
 * A commit is an immutable snapshot of the project: it points at the root
 * {@link Tree} and at zero or more parent commits. The `parents` array is what
 * turns the history into a directed acyclic graph — an initial commit has none,
 * a normal commit has one, a merge has several.
 */
export interface Commit {
  readonly type: "commit";
  /** Hash of the root tree captured by this commit. */
  readonly tree: ObjectId;
  /** Parent commit hashes, in significant order (first parent first). */
  readonly parents: readonly ObjectId[];
  readonly author: Author;
  /** Authoring time as Unix epoch **milliseconds** (UTC). Must be an integer. */
  readonly timestamp: number;
  readonly message: string;
}

/** Discriminated union of every object kind, keyed by `type`. */
export type GitVizObject = Blob | Tree | Commit;

// Re-export the shared type so consumers of @gitviz/core have a single import site.
export type { GitVizObjectType };
