import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { NotARepositoryError, RepositoryError } from "../errors.js";
import type { ObjectId } from "../object-id.js";
import { createBlob } from "../objects/blob.js";
import { createCommit } from "../objects/commit.js";
import { createTree } from "../objects/tree.js";
import type { Author, Commit, TreeEntry } from "../objects/types.js";
import { DEFAULT_BRANCH } from "../refs/ref-name.js";
import { FileSystemRefStore } from "../refs/fs-ref-store.js";
import type { RefStore } from "../refs/ref-store.js";
import { FileSystemObjectStore } from "../store/fs-object-store.js";
import type { ObjectStore } from "../store/object-store.js";

/** Directory name that holds a repository's metadata, like Git's `.git`. */
export const GITVIZ_DIR_NAME = ".gitviz";

/** One entry in a `log`: a commit paired with its content-addressable id. */
export interface CommitLogEntry {
  readonly id: ObjectId;
  readonly commit: Commit;
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
    if (!head) return [];

    const seen = new Set<string>();
    const entries: CommitLogEntry[] = [];
    const stack: ObjectId[] = [head];

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

    entries.sort(
      (a, b) =>
        b.commit.timestamp - a.commit.timestamp ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );
    return entries;
  }
}
