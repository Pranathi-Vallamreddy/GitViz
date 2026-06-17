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
