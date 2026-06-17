import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { deflate as deflateCb, inflate as inflateCb } from "node:zlib";

import { CorruptObjectError, ObjectNotFoundError } from "../errors.js";
import { hashBytes } from "../hash.js";
import { asObjectId, type ObjectId } from "../object-id.js";
import { decodeObject, frameObject, serialize } from "../objects/object.js";
import type { GitVizObject } from "../objects/types.js";
import type { ObjectStore } from "./object-store.js";

const deflate = promisify(deflateCb);
const inflate = promisify(inflateCb);

/** Number of leading hash characters used as the fan-out directory name. */
const FANOUT_PREFIX_LENGTH = 2;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Filesystem-backed {@link ObjectStore}, modeled on Git's loose-object store.
 *
 * Objects live under `<gitvizDir>/objects/`, sharded by the first two characters
 * of their hash so no single directory holds millions of files:
 *
 * ```
 * .gitviz/
 *   objects/
 *     aa/
 *       bbbbbbbb…   (remaining 62 hash chars; zlib-compressed framed bytes)
 * ```
 *
 * Because the path is derived entirely from the content hash, writing the same
 * content twice lands on the same path — **deduplication is automatic** and no
 * object is ever stored twice. Each file stores the zlib-compressed framed form
 * (`<type> <length>\0<content>`), so a read can recover the object's type and
 * verify its integrity without any external index.
 *
 * @example
 * ```ts
 * import { FileSystemObjectStore, createBlob } from "@gitviz/core";
 *
 * const store = new FileSystemObjectStore(".gitviz");
 * const id = await store.put(createBlob("hello world\n"));
 * await store.has(id);            // -> true
 * const blob = await store.get(id); // -> { type: "blob", data: <Buffer …> }
 *
 * // Storing identical content again returns the same id and writes nothing new.
 * const sameId = await store.put(createBlob("hello world\n"));
 * // id === sameId
 * ```
 */
export class FileSystemObjectStore implements ObjectStore {
  private readonly objectsDir: string;

  /**
   * @param gitvizDir Path to the repository's `.gitviz` directory. Objects are
   *   stored under `<gitvizDir>/objects`. Directories are created lazily on the
   *   first `put`, so the path need not exist yet.
   */
  constructor(gitvizDir: string) {
    this.objectsDir = path.join(gitvizDir, "objects");
  }

  /** Resolves the on-disk path of the object with the given id. */
  private objectPath(id: ObjectId): { dir: string; file: string } {
    const dir = path.join(this.objectsDir, id.slice(0, FANOUT_PREFIX_LENGTH));
    const file = path.join(dir, id.slice(FANOUT_PREFIX_LENGTH));
    return { dir, file };
  }

  async put(object: GitVizObject): Promise<ObjectId> {
    const framed = frameObject(object.type, serialize(object));
    const id = hashBytes(framed);
    const { dir, file } = this.objectPath(id);

    // Deduplicate: identical content hashes to this same path, so if it already
    // exists there is nothing to write.
    if (existsSync(file)) {
      return id;
    }

    const compressed = await deflate(framed);
    await fs.mkdir(dir, { recursive: true });

    // Write to a temp file then rename, so a reader never observes a partially
    // written object and concurrent writers cannot corrupt each other.
    const tmp = path.join(dir, `tmp-${randomUUID()}`);
    await fs.writeFile(tmp, compressed);
    try {
      await fs.rename(tmp, file);
    } catch (error) {
      // A concurrent writer may have created the (identical) object first. On
      // Windows rename onto an existing file throws; treat that as success.
      if (existsSync(file)) {
        await fs.rm(tmp, { force: true });
      } else {
        await fs.rm(tmp, { force: true });
        throw error;
      }
    }

    return id;
  }

  async get(id: ObjectId): Promise<GitVizObject> {
    asObjectId(id);
    const { file } = this.objectPath(id);

    let compressed: Buffer;
    try {
      compressed = await fs.readFile(file);
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        throw new ObjectNotFoundError(id);
      }
      throw error;
    }

    let framed: Buffer;
    try {
      framed = await inflate(compressed);
    } catch {
      throw new CorruptObjectError(`Object ${id} could not be decompressed`);
    }

    // Integrity check: the bytes must hash back to the id they were stored under.
    if (hashBytes(framed) !== id) {
      throw new CorruptObjectError(`Object ${id} failed its integrity check`);
    }

    try {
      return decodeObject(framed);
    } catch (error) {
      throw new CorruptObjectError(
        `Object ${id} could not be decoded: ${(error as Error).message}`,
      );
    }
  }

  async has(id: ObjectId): Promise<boolean> {
    asObjectId(id);
    return existsSync(this.objectPath(id).file);
  }
}
