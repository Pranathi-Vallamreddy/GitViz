import { GitVizError, Repository, type Author } from "@gitviz/core";

/**
 * Implementations of the `gitviz` commands. Each is a thin adapter: parse intent,
 * call the engine (`@gitviz/core`), and print human-readable output. All
 * filesystem/VCS logic lives in the engine, not here.
 */

/** Resolves the commit author from the environment, with a sensible default. */
function resolveAuthor(): Author {
  return {
    name: process.env.GITVIZ_AUTHOR_NAME ?? "GitViz User",
    email: process.env.GITVIZ_AUTHOR_EMAIL ?? "user@example.com",
  };
}

/** Runs an engine action, turning expected GitVizErrors into clean CLI output. */
export async function run(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof GitVizError) {
      console.error(`gitviz: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

export function initCommand(): Promise<void> {
  return run(async () => {
    const repo = await Repository.init(process.cwd());
    console.log(`Initialized empty GitViz repository in ${repo.gitvizDir}`);
  });
}

export function commitCommand(message: string): Promise<void> {
  return run(async () => {
    const repo = Repository.open(process.cwd());
    const id = await repo.commit(message, resolveAuthor());
    const branch = (await repo.refs.currentBranch()) ?? "detached HEAD";
    console.log(`[${branch} ${id.slice(0, 10)}] ${message.split("\n")[0]}`);
  });
}

export function checkoutCommand(ref: string, force: boolean): Promise<void> {
  return run(async () => {
    const repo = Repository.open(process.cwd());
    const result = await repo.checkout(ref, { force });
    if (result.detached) {
      console.log(`HEAD is now at ${result.commit.slice(0, 10)} (detached)`);
    } else {
      console.log(`Switched to branch '${result.branch}'`);
    }
  });
}

export function logCommand(): Promise<void> {
  return run(async () => {
    const repo = Repository.open(process.cwd());
    const entries = await repo.log();

    if (entries.length === 0) {
      console.log("No commits yet.");
      return;
    }

    const head = await repo.refs.resolveHead();
    const branch = await repo.refs.currentBranch();

    for (const { id, commit } of entries) {
      const decoration = id === head ? ` (HEAD${branch ? ` -> ${branch}` : ""})` : "";
      console.log(`commit ${id}${decoration}`);
      console.log(`Author: ${commit.author.name} <${commit.author.email}>`);
      console.log(`Date:   ${new Date(commit.timestamp).toISOString()}`);
      console.log("");
      for (const line of commit.message.split("\n")) {
        console.log(`    ${line}`);
      }
      console.log("");
    }
  });
}
