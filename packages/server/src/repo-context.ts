import { Repository } from "@gitviz/core";

/**
 * Resolves which repository the server visualizes.
 *
 * Read live (not cached) from `GITVIZ_REPO`, defaulting to the process working
 * directory. Reading it per call keeps the server stateless and lets tests point
 * at a temp repository by setting the env var before a request.
 */
export function resolveRepoPath(): string {
  return process.env.GITVIZ_REPO ?? process.cwd();
}

/**
 * Opens the configured repository, read-only and stateless (a fresh handle per
 * request). Throws `NotARepositoryError` if the path isn't a GitViz repo, which
 * the global error handler maps to HTTP 409.
 */
export function openRepository(): Repository {
  return Repository.open(resolveRepoPath());
}
