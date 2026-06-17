/**
 * The GitViz object model: blobs, trees, and commits, plus the generic codec
 * and content-addressable identity that bind them into a Merkle DAG.
 */

export type {
  Author,
  Blob,
  Commit,
  GitVizObject,
  GitVizObjectType,
  Tree,
  TreeEntry,
  TreeEntryType,
} from "./types.js";

export { createBlob, deserializeBlob, serializeBlob } from "./blob.js";
export { createTree, deserializeTree, serializeTree } from "./tree.js";
export { createCommit, deserializeCommit, serializeCommit } from "./commit.js";
export { computeObjectId, deserialize, frameObject, serialize } from "./object.js";
