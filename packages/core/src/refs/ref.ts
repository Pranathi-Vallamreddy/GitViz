import { ObjectParseError } from "../errors.js";
import { asObjectId, type ObjectId } from "../object-id.js";

/**
 * A reference is a named pointer. There are two kinds, mirroring Git:
 *
 *  - **direct** — points straight at a commit (e.g. `refs/heads/main` → a hash).
 *  - **symbolic** — points at another ref by name (e.g. `HEAD` → `refs/heads/main`).
 *
 * Branch refs are always direct; HEAD is usually symbolic (it names the current
 * branch) but may be direct when "detached" onto a specific commit.
 */
export type Ref =
  | { readonly kind: "direct"; readonly target: ObjectId }
  | { readonly kind: "symbolic"; readonly target: string };

const SYMBOLIC_PREFIX = "ref: ";

/** Constructs a direct ref pointing at a commit. */
export function directRef(target: ObjectId): Ref {
  return { kind: "direct", target };
}

/** Constructs a symbolic ref pointing at another ref by name. */
export function symbolicRef(target: string): Ref {
  return { kind: "symbolic", target };
}

/**
 * Serializes a ref to its on-disk text form (Git-compatible):
 *  - symbolic → `ref: <target>\n`
 *  - direct   → `<hash>\n`
 */
export function serializeRef(ref: Ref): string {
  return ref.kind === "symbolic"
    ? `${SYMBOLIC_PREFIX}${ref.target}\n`
    : `${ref.target}\n`;
}

/**
 * Parses the on-disk text form of a ref.
 *
 * @throws {ObjectParseError} if a direct ref's body is not a valid object id.
 */
export function parseRef(text: string): Ref {
  const body = text.trim();
  if (body.startsWith(SYMBOLIC_PREFIX)) {
    return symbolicRef(body.slice(SYMBOLIC_PREFIX.length).trim());
  }
  try {
    return directRef(asObjectId(body));
  } catch {
    throw new ObjectParseError(`Malformed ref: ${JSON.stringify(text)}`);
  }
}
