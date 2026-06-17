import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { CheckoutError, NotARepositoryError, RepositoryError } from "../errors.js";
import { isObjectId, type ObjectId } from "../object-id.js";
import { createBlob } from "../objects/blob.js";
import { createCommit } from "../objects/commit.js";
import { computeObjectId } from "../objects/object.js";
import { createTree } from "../objects/tree.js";
import type { Author, Commit, TreeEntry } from "../objects/types.js";
import { branchRefName, DEFAULT_BRANCH, isValidBranchName } from "../refs/ref-name.js";
import { FileSystemRefStore } from "../refs/fs-ref-store.js";
import type { RefStore } from "../refs/ref-store.js";
import { FileSystemObjectStore } from "../store/fs-object-store.js";
import type { ObjectStore } from "../store/object-store.js";
import { writeFileAtomic } from "../util/fs.js";

/** Directory name that holds a repository's metadata, like Git's `.git`. */
export const GITVIZ_DIR_NAME = ".gitviz";

/** One entry in a `log`: a commit paired with its content-addressable id. */
export interface CommitLogEntry {
  readonly id: ObjectId;
  readonly commit: Commit;
}

/**
 * The state of HEAD, used by the read model:
 *  - `branch`   — attached to a branch with at least one commit.
 *  - `detached` — pointing directly at a commit.
 *  - `unborn`   — attached to a branch that has no commits yet.
 */
export type HeadState =
  | { readonly kind: "branch"; readonly branch: string; readonly commit: ObjectId }
  | { readonly kind: "detached"; readonly commit: ObjectId }
  | { readonly kind: "unborn"; readonly branch: string };

/** A resolved branch reference. */
export interface RepoGraphRef {
  readonly name: string;
  readonly fullName: string;
  readonly target: ObjectId;
}

/** The whole commit DAG plus refs and HEAD — the read model for visualization. */
export interface RepoGraph {
  /** All commits reachable from any branch tip or HEAD, newest first. */
  readonly commits: CommitLogEntry[];
  readonly refs: RepoGraphRef[];
  readonly head: HeadState;
}

/** Orders commit-log entries newest-first, with id as a stable tie-breaker. */
function byNewestFirst(a: CommitLogEntry, b: CommitLogEntry): number {
  return (
    b.commit.timestamp - a.commit.timestamp || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

/** Options for {@link Repository.checkout}. */
export interface CheckoutOptions {
  /** Discard conflicting local changes instead of refusing the checkout. */
  readonly force?: boolean;
}

/** Outcome of a checkout: the commit now in the working tree and how HEAD moved. */
export interface CheckoutResult {
  readonly commit: ObjectId;
  /** The branch checked out, or undefined when HEAD is now detached. */
  readonly branch?: string;
  readonly detached: boolean;
}

/**
 * A GitViz repository: a working directory plus a `.gitviz/` metadata directory
 * containing the object store and refs.
 *
 * This is the façade that turns the low-level layers (objects, store, refs) into
 * the operations a user performs:
 *
 *  - {@link writeTree} — snapshot the working directory into tree/blob objects
 *  - {@link commit}    — snapshot + record a commit + advance the current branch
 *  - {@link log}       — walk the commit DAG from HEAD, newest first
 *
 * It performs no checkout/merge/diff; those are later phases.
 */
export class Repository {
  private constructor(
    /** Absolute path to the working directory. */
    readonly workdir: string,
    /** Absolute path to the `.gitviz` metadata directory. */
    readonly gitvizDir: string,
    readonly objects: ObjectStore,
    readonly refs: RefStore,
  ) {}

  /**
   * Initializes a new repository at `workdir`, pointing HEAD at an (unborn)
   * default branch — the GitViz equivalent of `git init`.
   *
   * @throws {RepositoryError} if a repository already exists there.
   */
  static async init(workdir: string): Promise<Repository> {
    const gitvizDir = path.join(workdir, GITVIZ_DIR_NAME);
    if (existsSync(path.join(gitvizDir, "HEAD"))) {
      throw new RepositoryError(`A GitViz repository already exists at ${gitvizDir}`);
    }
    const repo = new Repository(
      workdir,
      gitvizDir,
      new FileSystemObjectStore(gitvizDir),
      new FileSystemRefStore(gitvizDir),
    );
    await repo.refs.setHeadToBranch(DEFAULT_BRANCH);
    return repo;
  }

  /**
   * Opens an existing repository at `workdir`.
   *
   * @throws {NotARepositoryError} if `workdir` has no `.gitviz`.
   */
  static open(workdir: string): Repository {
    const gitvizDir = path.join(workdir, GITVIZ_DIR_NAME);
    if (!existsSync(path.join(gitvizDir, "HEAD"))) {
      throw new NotARepositoryError(`Not a GitViz repository: ${workdir}`);
    }
    return new Repository(
      workdir,
      gitvizDir,
      new FileSystemObjectStore(gitvizDir),
      new FileSystemRefStore(gitvizDir),
    );
  }

  /**
   * Recursively snapshots `dir` into the object store and returns the id of the
   * root tree. Files become blobs, sub-directories become trees. The traversal
   * is deterministic (tree entries are sorted by name), so an unchanged tree
   * always produces the same id and unchanged files/subtrees are deduplicated by
   * the store automatically.
   *
   * Empty directories are skipped (a tree has no way to represent them), and the
   * `.gitviz` metadata directory is never included. Symlinks and other special
   * files are ignored.
   */
  async writeTree(dir: string = this.workdir): Promise<ObjectId> {
    const entries = await this.snapshotDir(dir);
    return this.objects.put(createTree(entries));
  }

  /** Builds (but does not wrap) the tree entries for a single directory. */
  private async snapshotDir(dir: string): Promise<TreeEntry[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const entries: TreeEntry[] = [];

    for (const dirent of dirents) {
      // Never snapshot the repository's own metadata directory.
      if (dir === this.workdir && dirent.name === GITVIZ_DIR_NAME) continue;

      const full = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        const childEntries = await this.snapshotDir(full);
        if (childEntries.length === 0) continue; // skip empty directories
        const childTree = await this.objects.put(createTree(childEntries));
        entries.push({ name: dirent.name, type: "tree", hash: childTree });
      } else if (dirent.isFile()) {
        const data = await fs.readFile(full);
        const blob = await this.objects.put(createBlob(data));
        entries.push({ name: dirent.name, type: "blob", hash: blob });
      }
    }

    return entries;
  }

  /**
   * Records the current working tree as a new commit and advances the current
   * branch (or detached HEAD) to it. The previous HEAD commit becomes the new
   * commit's parent, growing the DAG.
   *
   * @returns the new commit's id.
   */
  async commit(
    message: string,
    author: Author,
    timestamp: number = Date.now(),
  ): Promise<ObjectId> {
    const tree = await this.writeTree();
    const parent = await this.refs.resolveHead();
    const parents = parent ? [parent] : [];

    const commitId = await this.objects.put(
      createCommit({ tree, parents, author, timestamp, message }),
    );

    const branch = await this.refs.currentBranch();
    if (branch !== undefined) {
      await this.refs.setBranch(branch, commitId);
    } else {
      // Detached HEAD: advance HEAD itself rather than a branch.
      await this.refs.setHeadDetached(commitId);
    }

    return commitId;
  }

  /**
   * Walks the commit DAG reachable from HEAD and returns the commits in reverse
   * chronological order (newest first). Handles multiple parents (merges) by
   * visiting every ancestor once, then sorting by timestamp (id as a stable
   * tie-breaker).
   *
   * @returns an empty array if HEAD is unborn (no commits yet).
   */
  async log(): Promise<CommitLogEntry[]> {
    const head = await this.refs.resolveHead();
    return head ? this.collectHistory([head]) : [];
  }

  /**
   * Builds the full read model for visualization: every commit reachable from
   * any branch tip or HEAD, the resolved branch refs, and the HEAD state. This
   * is the multi-root generalization of {@link log} (which seeds from HEAD only).
   */
  async graph(): Promise<RepoGraph> {
    const refs: RepoGraphRef[] = [];
    const roots = new Set<ObjectId>();

    for (const name of await this.refs.listBranches()) {
      const target = await this.refs.readBranch(name);
      if (!target) continue; // skip a branch ref with no commit
      refs.push({ name, fullName: branchRefName(name), target });
      roots.add(target);
    }

    const head = await this.headState();
    if (head.kind !== "unborn") roots.add(head.commit);

    const commits = await this.collectHistory([...roots]);
    return { commits, refs, head };
  }

  /** Derives the current {@link HeadState} from the ref store. */
  private async headState(): Promise<HeadState> {
    const head = await this.refs.getHead();
    if (head?.kind === "direct") {
      return { kind: "detached", commit: head.target };
    }
    // Symbolic (or, defensively, missing) → attached to a branch.
    const branch = (await this.refs.currentBranch()) ?? DEFAULT_BRANCH;
    const commit = await this.refs.resolveHead();
    return commit ? { kind: "branch", branch, commit } : { kind: "unborn", branch };
  }

  /**
   * Walks the commit DAG from the given roots, visiting each commit once, and
   * returns the results newest-first. Multiple roots (branch tips) converge
   * naturally because shared ancestors are deduplicated.
   */
  private async collectHistory(roots: ObjectId[]): Promise<CommitLogEntry[]> {
    const seen = new Set<string>();
    const entries: CommitLogEntry[] = [];
    const stack = [...roots];

    while (stack.length > 0) {
      const id = stack.pop() as ObjectId;
      if (seen.has(id)) continue;
      seen.add(id);

      const object = await this.objects.get(id);
      if (object.type !== "commit") {
        throw new RepositoryError(`Expected a commit, found ${object.type}: ${id}`);
      }

      entries.push({ id, commit: object });
      for (const parent of object.parents) {
        if (!seen.has(parent)) stack.push(parent);
      }
    }

    entries.sort(byNewestFirst);
    return entries;
  }

  /**
   * Checks out a branch or commit: materializes its tree into the working
   * directory and updates HEAD.
   *
   *  - A **branch name** moves HEAD symbolically (`HEAD → refs/heads/<branch>`),
   *    so subsequent commits advance that branch.
   *  - A **commit id** detaches HEAD onto that commit.
   *
   * Materialization is the inverse of `writeTree`: every blob in the target tree
   * is written (creating directories as needed), and every file that the current
   * commit tracked but the target does not is removed, then newly empty
   * directories are pruned. Untracked files are left untouched.
   *
   * Safety: unless `force` is set, the checkout refuses (throwing
   * {@link CheckoutError}) if it would overwrite or remove uncommitted local
   * changes, listing the offending paths.
   */
  async checkout(target: string, options: CheckoutOptions = {}): Promise<CheckoutResult> {
    const resolved = await this.resolveCheckoutTarget(target);

    const targetCommit = await this.objects.get(resolved.commit);
    if (targetCommit.type !== "commit") {
      throw new CheckoutError(`Object ${resolved.commit} is not a commit`);
    }
    const targetFiles = await this.treeToFileMap(targetCommit.tree);

    // Files tracked by the current commit — what we are allowed to remove.
    const currentFiles = await this.currentTrackedFiles();

    if (!options.force) {
      await this.assertNoOverwrites(currentFiles, targetFiles);
    }

    // Remove files the current commit tracked that the target does not have.
    for (const relPath of currentFiles.keys()) {
      if (!targetFiles.has(relPath)) {
        await fs.rm(this.toAbsolute(relPath), { force: true });
      }
    }

    // Write (overwrite) every file in the target tree.
    for (const [relPath, blobId] of targetFiles) {
      const blob = await this.objects.get(blobId);
      if (blob.type !== "blob") {
        throw new CheckoutError(`Object ${blobId} is not a blob`);
      }
      await writeFileAtomic(this.toAbsolute(relPath), blob.data);
    }

    await this.removeEmptyDirs(this.workdir);

    // Update HEAD last, once the working tree is consistent.
    if (resolved.branch !== undefined) {
      await this.refs.setHeadToBranch(resolved.branch);
      return { commit: resolved.commit, branch: resolved.branch, detached: false };
    }
    await this.refs.setHeadDetached(resolved.commit);
    return { commit: resolved.commit, detached: true };
  }

  /** Resolves a checkout target (branch name preferred, else commit id). */
  private async resolveCheckoutTarget(
    target: string,
  ): Promise<{ commit: ObjectId; branch?: string }> {
    if (isValidBranchName(target)) {
      const branchCommit = await this.refs.resolve(branchRefName(target));
      if (branchCommit) {
        return { commit: branchCommit, branch: target };
      }
    }
    if (isObjectId(target) && (await this.objects.has(target))) {
      return { commit: target };
    }
    throw new CheckoutError(`'${target}' did not match any branch or commit`);
  }

  /** The set of files tracked by the commit HEAD currently resolves to. */
  private async currentTrackedFiles(): Promise<Map<string, ObjectId>> {
    const commitId = await this.refs.resolveHead();
    if (!commitId) return new Map();
    const commit = await this.objects.get(commitId);
    if (commit.type !== "commit") {
      throw new RepositoryError(`HEAD does not point at a commit: ${commitId}`);
    }
    return this.treeToFileMap(commit.tree);
  }

  /** Flattens a tree (recursively) into a map of relative path → blob id. */
  private async treeToFileMap(treeId: ObjectId): Promise<Map<string, ObjectId>> {
    const files = new Map<string, ObjectId>();

    const walk = async (id: ObjectId, prefix: string): Promise<void> => {
      const object = await this.objects.get(id);
      if (object.type !== "tree") {
        throw new RepositoryError(`Expected a tree, found ${object.type}: ${id}`);
      }
      for (const entry of object.entries) {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.type === "blob") {
          files.set(relPath, entry.hash);
        } else {
          await walk(entry.hash, relPath);
        }
      }
    };

    await walk(treeId, "");
    return files;
  }

  /** Hashes the current working tree into a map of relative path → blob id. */
  private async scanWorkdir(): Promise<Map<string, ObjectId>> {
    const files = new Map<string, ObjectId>();

    const walk = async (dir: string, prefix: string): Promise<void> => {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        if (dir === this.workdir && dirent.name === GITVIZ_DIR_NAME) continue;
        const full = path.join(dir, dirent.name);
        const relPath = prefix ? `${prefix}/${dirent.name}` : dirent.name;
        if (dirent.isDirectory()) {
          await walk(full, relPath);
        } else if (dirent.isFile()) {
          const data = await fs.readFile(full);
          files.set(relPath, computeObjectId(createBlob(data)));
        }
      }
    };

    await walk(this.workdir, "");
    return files;
  }

  /**
   * Refuses the checkout if it would clobber uncommitted work. A path conflicts
   * when the working copy differs from the current commit (a local change) *and*
   * the checkout would change that path again — discarding the change.
   */
  private async assertNoOverwrites(
    currentFiles: ReadonlyMap<string, ObjectId>,
    targetFiles: ReadonlyMap<string, ObjectId>,
  ): Promise<void> {
    const working = await this.scanWorkdir();
    const conflicts: string[] = [];

    // Only paths the checkout touches (writes or removes) can conflict.
    for (const relPath of new Set([...currentFiles.keys(), ...targetFiles.keys()])) {
      const committed = currentFiles.get(relPath);
      const desired = targetFiles.get(relPath);
      const actual = working.get(relPath);

      const locallyModified = actual !== committed;
      const checkoutWouldChange = desired !== actual;
      if (locallyModified && checkoutWouldChange) {
        conflicts.push(relPath);
      }
    }

    if (conflicts.length > 0) {
      conflicts.sort();
      throw new CheckoutError(
        `Your local changes to the following files would be overwritten by checkout:\n${conflicts
          .map((p) => `  ${p}`)
          .join("\n")}`,
        conflicts,
      );
    }
  }

  /** Resolves a repo-relative ("/"-separated) path to an absolute OS path. */
  private toAbsolute(relPath: string): string {
    return path.join(this.workdir, ...relPath.split("/"));
  }

  /**
   * Recursively removes directories that became empty, never touching the
   * working-directory root or `.gitviz`. Returns whether `dir` itself is now
   * empty (so a caller can remove it).
   */
  private async removeEmptyDirs(dir: string): Promise<boolean> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    let remaining = 0;

    for (const dirent of dirents) {
      if (dir === this.workdir && dirent.name === GITVIZ_DIR_NAME) {
        remaining++;
        continue;
      }
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (await this.removeEmptyDirs(full)) {
          await fs.rmdir(full);
        } else {
          remaining++;
        }
      } else {
        remaining++;
      }
    }

    return remaining === 0 && dir !== this.workdir;
  }
}
