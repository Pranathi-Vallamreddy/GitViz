import type { Blob } from "./types.js";

/**
 * Blob construction and (de)serialization.
 *
 * A blob's serialized form is simply its raw bytes — there is no extra framing
 * at this layer. The type/length envelope used for hashing is applied uniformly
 * to every object kind in `object.ts`, so it lives there rather than here.
 */

/** Creates a {@link Blob} from a Buffer or a UTF-8 string. */
export function createBlob(data: Buffer | string): Blob {
  return {
    type: "blob",
    data: typeof data === "string" ? Buffer.from(data, "utf8") : data,
  };
}

/** Serializes a blob to its canonical byte content (the raw file bytes). */
export function serializeBlob(blob: Blob): Buffer {
  return blob.data;
}

/** Reconstructs a {@link Blob} from its serialized content. */
export function deserializeBlob(content: Buffer): Blob {
  return { type: "blob", data: content };
}
