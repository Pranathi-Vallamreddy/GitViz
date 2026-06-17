/**
 * Error types for the GitViz engine.
 *
 * Every error thrown by the core deliberately extends {@link GitVizError} so
 * callers (CLI, server) can distinguish engine failures from programming errors
 * with a single `instanceof` check.
 */

/** Base class for all errors raised by the GitViz engine. */
export class GitVizError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore the prototype chain when targeting older runtimes / down-leveled output.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an input that should be a valid object id (a 64-character
 * lowercase hex SHA-256 digest) is not.
 */
export class InvalidObjectIdError extends GitVizError {
  constructor(value: unknown) {
    super(`Invalid object id: ${JSON.stringify(value)}`);
  }
}

/** Thrown when a value fails an object-model invariant before serialization. */
export class InvalidObjectError extends GitVizError {}

/**
 * Thrown when raw bytes cannot be parsed back into a structured object.
 * Indicates corruption or a format mismatch.
 */
export class ObjectParseError extends GitVizError {}

/** Thrown by an object store when the requested object id is not present. */
export class ObjectNotFoundError extends GitVizError {
  constructor(public readonly objectId: string) {
    super(`Object not found: ${objectId}`);
  }
}

/**
 * Thrown when a stored object fails to decode or its recomputed hash does not
 * match the id it was stored under — i.e. the bytes on disk are corrupt.
 */
export class CorruptObjectError extends GitVizError {}

/** Thrown when a ref or branch name violates the naming rules. */
export class InvalidRefNameError extends GitVizError {
  constructor(name: string, reason: string) {
    super(`Invalid ref name "${name}": ${reason}`);
  }
}

/**
 * Thrown when a symbolic ref cannot be resolved — e.g. the chain is cyclic or
 * exceeds the maximum depth.
 */
export class RefResolutionError extends GitVizError {}

/** Thrown for repository-level failures (e.g. initializing one that exists). */
export class RepositoryError extends GitVizError {}

/** Thrown when an operation needs a repository but the path isn't one. */
export class NotARepositoryError extends GitVizError {}
