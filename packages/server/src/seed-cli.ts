import { resolveRepoPath } from "./repo-context.js";
import { seedDemoRepo } from "./seed.js";

/** `pnpm --filter @gitviz/server seed [dir]` — seed a demo repo for local dev. */
const dir = process.argv[2] ?? resolveRepoPath();
await seedDemoRepo(dir);
console.log(`Seeded demo repository at ${dir}`);
