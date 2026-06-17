import * as fs from "node:fs/promises";
import * as path from "node:path";

import { RefResolutionError } from "../errors.js";
import { asObjectId, type ObjectId } from "../object-id.js";
import { writeFileAtomic } from "../util/fs.js";
import {
  assertValidBranchName,
  assertValidRefName,
  branchRefName,
  HEAD,
  HEADS_PREFIX,
} from "./ref-name.js";
import { directRef, parseRef, serializeRef, symbolicRef, type Ref } from "./ref.js";
import type { RefStore } from "./ref-store.js";

/** Maximum symbolic-ref hops before resolution is treated as cyclic. */
const MAX_SYMBOLIC_DEPTH = 10;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Filesystem-backed {@link RefStore}, modeled on Git's ref layout.
 *
 * ```
 * .gitviz/
 *   HEAD                      ("ref: refs/heads/main")
 *   refs/
 *     heads/
 *       main                  ("<commit hash>")
 *       feature/login         (nested branch names become nested directories)
 * ```
 *
 * Ref names map directly to paths (`refs/heads/main` →
 * `<gitvizDir>/refs/heads/main`), and every write goes through an atomic
 * temp-file + rename so a branch update is never observed half-written.
 *
 * @example
 * ```ts
 * const refs = new FileSystemRefStore(".gitviz");
 * await refs.setHeadToBranch("main");        // HEAD -> refs/heads/main (unborn)
 * await refs.setBranch("main", commitId);    // create the branch
 * await refs.currentBranch();                // -> "main"
 * await refs.resolveHead();                  // -> commitId
 * ```
 */
export class FileSystemRefStore implements RefStore {
  constructor(private readonly gitvizDir: string) {}

  /** Maps a ref name to its on-disk path (ref names use "/" segments). */
  private refPath(name: string): string {
    return path.join(this.gitvizDir, ...name.split("/"));
  }

  async readRef(name: string): Promise<Ref | undefined> {
    let text: string;
    try {
      text = await fs.readFile(this.refPath(name), "utf8");
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") return undefined;
      throw error;
    }
    return parseRef(text);
  }

  async writeRef(name: string, ref: Ref): Promise<void> {
    assertValidRefName(name);
    if (ref.kind === "symbolic") {
      assertValidRefName(ref.target);
    }
    await writeFileAtomic(this.refPath(name), serializeRef(ref));
  }

  async deleteRef(name: string): Promise<boolean> {
    try {
      await fs.unlink(this.refPath(name));
      return true;
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") return false;
      throw error;
    }
  }

  async listRefs(prefix = "refs/"): Promise<string[]> {
    const root = path.join(this.gitvizDir, "refs");
    const names: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") return;
        throw error;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          // Normalize to a forward-slash ref name regardless of OS separator.
          names.push(path.relative(this.gitvizDir, full).split(path.sep).join("/"));
        }
      }
    };

    await walk(root);
    return names.filter((name) => name.startsWith(prefix)).sort();
  }

  async resolve(name: string): Promise<ObjectId | undefined> {
    let current = name;
    const seen = new Set<string>();

    for (let depth = 0; depth < MAX_SYMBOLIC_DEPTH; depth++) {
      if (seen.has(current)) {
        throw new RefResolutionError(`Cyclic symbolic ref while resolving "${name}"`);
      }
      seen.add(current);

      const ref = await this.readRef(current);
      if (!ref) return undefined; // unborn branch / missing ref
      if (ref.kind === "direct") return ref.target;
      current = ref.target;
    }

    throw new RefResolutionError(`Too many symbolic levels while resolving "${name}"`);
  }

  // --- Branch convenience ---

  async readBranch(branch: string): Promise<ObjectId | undefined> {
    assertValidBranchName(branch);
    return this.resolve(branchRefName(branch));
  }

  async setBranch(branch: string, commit: ObjectId): Promise<void> {
    assertValidBranchName(branch);
    await this.writeRef(branchRefName(branch), directRef(asObjectId(commit)));
  }

  async deleteBranch(branch: string): Promise<boolean> {
    assertValidBranchName(branch);
    return this.deleteRef(branchRefName(branch));
  }

  async listBranches(): Promise<string[]> {
    const refs = await this.listRefs(HEADS_PREFIX);
    return refs.map((name) => name.slice(HEADS_PREFIX.length)).sort();
  }

  // --- HEAD ---

  getHead(): Promise<Ref | undefined> {
    return this.readRef(HEAD);
  }

  async setHeadToBranch(branch: string): Promise<void> {
    assertValidBranchName(branch);
    await this.writeRef(HEAD, symbolicRef(branchRefName(branch)));
  }

  async setHeadDetached(commit: ObjectId): Promise<void> {
    await this.writeRef(HEAD, directRef(asObjectId(commit)));
  }

  async currentBranch(): Promise<string | undefined> {
    const head = await this.getHead();
    if (head?.kind !== "symbolic") return undefined;
    return head.target.startsWith(HEADS_PREFIX)
      ? head.target.slice(HEADS_PREFIX.length)
      : undefined;
  }

  resolveHead(): Promise<ObjectId | undefined> {
    return this.resolve(HEAD);
  }
}
