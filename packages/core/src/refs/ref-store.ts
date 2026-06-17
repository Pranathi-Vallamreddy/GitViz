import type { ObjectId } from "../object-id.js";
import type { Ref } from "./ref.js";

/**
 * Storage and resolution of refs and HEAD.
 *
 * The interface has three layers:
 *
 *  - **Low-level ref I/O** (`readRef`/`writeRef`/`deleteRef`/`listRefs`) treats a
 *    ref as a named, possibly-symbolic pointer.
 *  - **Branch convenience** wraps the `refs/heads/<branch>` namespace.
 *  - **HEAD** captures the "current branch / current commit" concept.
 *
 * `resolve` walks a symbolic chain (HEAD → refs/heads/main → a commit) to a
 * concrete commit id. All writes are atomic.
 */
export interface RefStore {
  // --- Low-level ref I/O ---

  /** Reads a ref by full name (e.g. `HEAD`, `refs/heads/main`), or undefined. */
  readRef(name: string): Promise<Ref | undefined>;

  /** Atomically writes a ref. Validates the name (and a symbolic target). */
  writeRef(name: string, ref: Ref): Promise<void>;

  /** Deletes a ref. Resolves to `true` if it existed, `false` otherwise. */
  deleteRef(name: string): Promise<boolean>;

  /** Lists full names of all refs, optionally filtered to those under `prefix`. */
  listRefs(prefix?: string): Promise<string[]>;

  /**
   * Resolves a ref name to a commit id, following any symbolic chain. Returns
   * undefined when the chain ends at a ref that does not exist yet (an "unborn"
   * branch, e.g. `main` in a fresh repo).
   *
   * @throws {RefResolutionError} if the symbolic chain is cyclic or too deep.
   */
  resolve(name: string): Promise<ObjectId | undefined>;

  // --- Branch convenience (refs/heads/<branch>) ---

  /** Resolves a branch to its commit id, or undefined if it doesn't exist. */
  readBranch(branch: string): Promise<ObjectId | undefined>;

  /** Creates or moves a branch to point at `commit`. */
  setBranch(branch: string, commit: ObjectId): Promise<void>;

  /** Deletes a branch. Resolves to `true` if it existed. */
  deleteBranch(branch: string): Promise<boolean>;

  /** Lists short branch names (without the `refs/heads/` prefix), sorted. */
  listBranches(): Promise<string[]>;

  // --- HEAD ---

  /** Reads HEAD (symbolic → current branch, or direct → detached commit). */
  getHead(): Promise<Ref | undefined>;

  /** Points HEAD at a branch (symbolic): `HEAD → refs/heads/<branch>`. */
  setHeadToBranch(branch: string): Promise<void>;

  /** Points HEAD directly at a commit (detached HEAD). */
  setHeadDetached(commit: ObjectId): Promise<void>;

  /** The branch HEAD points at, or undefined when HEAD is detached/unset. */
  currentBranch(): Promise<string | undefined>;

  /** The commit HEAD resolves to, or undefined on an unborn branch. */
  resolveHead(): Promise<ObjectId | undefined>;
}
