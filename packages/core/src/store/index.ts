/**
 * Object persistence: the {@link ObjectStore} contract and its filesystem
 * implementation. Higher layers (refs, history, diff) depend only on the
 * interface, never on the concrete store.
 */

export type { ObjectStore } from "./object-store.js";
export { FileSystemObjectStore } from "./fs-object-store.js";
