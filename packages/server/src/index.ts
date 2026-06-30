import { buildApp } from "./app.js";
import { config } from "./config.js";
import { resolveRepoPath } from "./repo-context.js";
import { seedDemoRepo } from "./seed.js";

/** Process entrypoint: build the app and bind the configured port. */
async function main(): Promise<void> {
  // Ensure the configured repo exists so the app is never empty on first load
  // (e.g. a fresh deployment). No-op if a repo is already present, and opt-out
  // via GITVIZ_SEED=false.
  if (process.env.GITVIZ_SEED !== "false") {
    await seedDemoRepo(resolveRepoPath());
  }

  const app = await buildApp();

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
