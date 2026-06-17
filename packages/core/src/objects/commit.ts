import { InvalidObjectError, ObjectParseError } from "../errors.js";
import { asObjectId } from "../object-id.js";
import type { Author, Commit } from "./types.js";

/**
 * Commit construction and (de)serialization.
 *
 * Serialized layout — a small, line-oriented text header followed by a blank
 * line and the raw message:
 *
 *   tree <hash>
 *   parent <hash>        (one line per parent, in order; omitted for a root commit)
 *   author <name> <email> <timestamp>
 *                        (blank line)
 *   <message...>
 *
 * The blank line is the unambiguous header/message boundary: header lines never
 * contain a blank line, so the *first* "\n\n" always separates the two. The
 * message is stored verbatim, so round-tripping is exact.
 */

const HEADER_TREE = "tree ";
const HEADER_PARENT = "parent ";
const HEADER_AUTHOR = "author ";
const BODY_SEPARATOR = "\n\n";

const AUTHOR_LINE = /^author (.+) <([^>]*)> (-?\d+)$/;

function validateAuthor(author: Author): void {
  if (author.name.length === 0) {
    throw new InvalidObjectError("Commit author name must not be empty");
  }
  if (author.name.includes("<") || author.name.includes("\n")) {
    throw new InvalidObjectError('Commit author name must not contain "<" or a newline');
  }
  if (author.email.includes(">") || author.email.includes("\n")) {
    throw new InvalidObjectError('Commit author email must not contain ">" or a newline');
  }
}

/**
 * Creates a validated {@link Commit}.
 *
 * @throws {InvalidObjectError} on an invalid tree/parent hash, a malformed
 *   author, or a non-integer timestamp.
 */
export function createCommit(params: {
  tree: string;
  parents?: readonly string[];
  author: Author;
  timestamp: number;
  message: string;
}): Commit {
  const tree = asObjectId(params.tree);
  const parents = (params.parents ?? []).map((p) => asObjectId(p));

  validateAuthor(params.author);

  if (!Number.isSafeInteger(params.timestamp)) {
    throw new InvalidObjectError(
      `Commit timestamp must be a safe integer (epoch ms): ${params.timestamp}`,
    );
  }

  return {
    type: "commit",
    tree,
    parents,
    author: { name: params.author.name, email: params.author.email },
    timestamp: params.timestamp,
    message: params.message,
  };
}

/** Serializes a commit to its canonical byte content. */
export function serializeCommit(commit: Commit): Buffer {
  const lines: string[] = [`${HEADER_TREE}${commit.tree}`];
  for (const parent of commit.parents) {
    lines.push(`${HEADER_PARENT}${parent}`);
  }
  lines.push(
    `${HEADER_AUTHOR}${commit.author.name} <${commit.author.email}> ${commit.timestamp}`,
  );

  return Buffer.from(`${lines.join("\n")}${BODY_SEPARATOR}${commit.message}`, "utf8");
}

/** Reconstructs a {@link Commit} from its serialized content. */
export function deserializeCommit(content: Buffer): Commit {
  const text = content.toString("utf8");
  const sepIdx = text.indexOf(BODY_SEPARATOR);
  if (sepIdx === -1) {
    throw new ObjectParseError("Malformed commit: missing header/message separator");
  }

  const header = text.slice(0, sepIdx);
  const message = text.slice(sepIdx + BODY_SEPARATOR.length);

  let tree: string | undefined;
  const parents: string[] = [];
  let author: Author | undefined;
  let timestamp: number | undefined;

  for (const line of header.split("\n")) {
    if (line.startsWith(HEADER_TREE)) {
      tree = line.slice(HEADER_TREE.length);
    } else if (line.startsWith(HEADER_PARENT)) {
      parents.push(line.slice(HEADER_PARENT.length));
    } else if (line.startsWith(HEADER_AUTHOR)) {
      const match = AUTHOR_LINE.exec(line);
      if (!match) {
        throw new ObjectParseError(`Malformed commit: bad author line "${line}"`);
      }
      author = { name: match[1]!, email: match[2]! };
      timestamp = Number(match[3]);
    } else {
      throw new ObjectParseError(`Malformed commit: unknown header line "${line}"`);
    }
  }

  if (tree === undefined) {
    throw new ObjectParseError("Malformed commit: missing tree header");
  }
  if (author === undefined || timestamp === undefined) {
    throw new ObjectParseError("Malformed commit: missing author header");
  }

  // Funnel through the validating constructor so parsed objects satisfy the
  // same invariants as freshly created ones.
  return createCommit({ tree, parents, author, timestamp, message });
}
