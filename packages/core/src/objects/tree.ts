import { InvalidObjectError, ObjectParseError } from "../errors.js";
import { asObjectId } from "../object-id.js";
import type { Tree, TreeEntry, TreeEntryType } from "./types.js";

/**
 * Tree construction and (de)serialization.
 *
 * Serialized layout — entries are written back to back, each as:
 *
 *   `<type> <name>\0<32 raw hash bytes>`
 *
 * The single space separates the (space-free) type token from the name; the NUL
 * byte terminates the variable-length name; the digest is a fixed 32 bytes, so
 * the parser always knows where the next entry begins. Entries are sorted by
 * name before writing, which is what makes the encoding **deterministic**: two
 * directories with the same contents always produce identical bytes and thus the
 * same hash.
 */

const SPACE = 0x20;
const NUL = 0x00;
/** SHA-256 digest length in bytes (256 bits / 8). */
const HASH_BYTE_LENGTH = 32;

function isTreeEntryType(value: string): value is TreeEntryType {
  return value === "blob" || value === "tree";
}

/** Orders entries by their name's UTF-8 byte sequence (total + stable). */
function byName(a: TreeEntry, b: TreeEntry): number {
  return Buffer.compare(Buffer.from(a.name, "utf8"), Buffer.from(b.name, "utf8"));
}

/**
 * Creates a validated, canonically ordered {@link Tree}.
 *
 * @throws {InvalidObjectError} on an empty name, a name containing "/" or NUL,
 *   a duplicate name, or an invalid entry hash.
 */
export function createTree(entries: readonly TreeEntry[]): Tree {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.name.length === 0) {
      throw new InvalidObjectError("Tree entry name must not be empty");
    }
    if (entry.name.includes("/") || entry.name.includes("\0")) {
      throw new InvalidObjectError(
        `Tree entry name must not contain "/" or NUL: ${JSON.stringify(entry.name)}`,
      );
    }
    if (seen.has(entry.name)) {
      throw new InvalidObjectError(`Duplicate tree entry name: ${entry.name}`);
    }
    seen.add(entry.name);
    // Re-brand defensively: rejects an unvalidated string slipped in via `as`.
    asObjectId(entry.hash);
  }

  const sorted = [...entries].sort(byName);
  return { type: "tree", entries: sorted };
}

/** Serializes a tree to its canonical byte content (entries sorted by name). */
export function serializeTree(tree: Tree): Buffer {
  const sorted = [...tree.entries].sort(byName);
  const chunks: Buffer[] = [];

  for (const entry of sorted) {
    const prefix = Buffer.from(`${entry.type} ${entry.name}\0`, "utf8");
    const hash = Buffer.from(entry.hash, "hex");
    if (hash.length !== HASH_BYTE_LENGTH) {
      throw new InvalidObjectError(
        `Tree entry hash is not a SHA-256 digest: ${entry.hash}`,
      );
    }
    chunks.push(prefix, hash);
  }

  return Buffer.concat(chunks);
}

/** Reconstructs a {@link Tree} from its serialized content. */
export function deserializeTree(content: Buffer): Tree {
  const entries: TreeEntry[] = [];
  let pos = 0;

  while (pos < content.length) {
    const spaceIdx = content.indexOf(SPACE, pos);
    if (spaceIdx === -1) {
      throw new ObjectParseError("Malformed tree: missing type/name separator");
    }
    const typeToken = content.toString("utf8", pos, spaceIdx);
    if (!isTreeEntryType(typeToken)) {
      throw new ObjectParseError(`Malformed tree: unknown entry type "${typeToken}"`);
    }

    const nulIdx = content.indexOf(NUL, spaceIdx + 1);
    if (nulIdx === -1) {
      throw new ObjectParseError("Malformed tree: unterminated entry name");
    }
    const name = content.toString("utf8", spaceIdx + 1, nulIdx);

    const hashStart = nulIdx + 1;
    const hashEnd = hashStart + HASH_BYTE_LENGTH;
    if (hashEnd > content.length) {
      throw new ObjectParseError("Malformed tree: truncated entry hash");
    }
    const hash = asObjectId(content.toString("hex", hashStart, hashEnd));

    entries.push({ name, type: typeToken, hash });
    pos = hashEnd;
  }

  return { type: "tree", entries };
}
