import type { ObjectId } from "../object-id.js";
import type { GitVizObject } from "../objects/types.js";

/**
 * A content-addressable store for GitViz objects.
 *
 * Objects are immutable and keyed by the hash of their content, so the store has
 * no `update` or `delete` in its core contract: writing the same object twice is
 * idempotent and naturally deduplicated.
 *
 * Methods are asynchronous because the canonical implementation is backed by the
 * filesystem; an in-memory implementation can satisfy the same interface for
 * tests or ephemeral use.
 */
export interface ObjectStore {
  /**
   * Persists an object and returns its content-addressable id. Storing content
   * that already exists is a no-op (deduplication) but still returns the id.
   */
  put(object: GitVizObject): Promise<ObjectId>;

  /**
   * Retrieves and reconstructs the object stored under `id`.
   *
   * @throws {ObjectNotFoundError} if no object is stored under `id`.
   * @throws {CorruptObjectError} if the stored bytes cannot be decoded or fail
   *   the integrity check.
   */
  get(id: ObjectId): Promise<GitVizObject>;

  /** Reports whether an object is stored under `id`. */
  has(id: ObjectId): Promise<boolean>;

  /** Total number of distinct objects currently stored. */
  count(): Promise<number>;
}
