/**
 * @gitviz/shared
 *
 * Framework-agnostic types and constants shared across the engine, server, CLI,
 * and web client. This package has no runtime dependencies and must never import
 * a web or server framework.
 *
 * Phase 0: placeholder. The real object-model and API contract types land in
 * Phase 1 / Phase 2.
 */

/** Library version, surfaced by the server and CLI for diagnostics. */
export const GITVIZ_VERSION = "0.0.0";

/** The kinds of objects stored in the content-addressable store. */
export type GitVizObjectType = "blob" | "tree" | "commit";

// API wire contract (server <-> web).
export * from "./dto.js";
