#!/usr/bin/env node
import { CORE_VERSION } from "@gitviz/core";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { commitCommand, initCommand, logCommand } from "./commands.js";

/**
 * `gitviz` CLI.
 *
 * `init`, `commit`, and `log` are implemented on top of @gitviz/core. The
 * remaining commands (checkout/branch management) are stubbed until later phases.
 */

const notImplemented = (command: string) => () => {
  console.log(`gitviz: '${command}' is not implemented yet.`);
};

await yargs(hideBin(process.argv))
  .scriptName("gitviz")
  .usage("$0 <command> [options]")
  .command("init", "Initialize a new GitViz repository", {}, () => initCommand())
  .command(
    "commit",
    "Snapshot the working tree as a new commit",
    (y) =>
      y.option("message", {
        alias: "m",
        describe: "Commit message",
        type: "string",
        demandOption: true,
      }),
    (argv) => commitCommand(argv.message),
  )
  .command("log", "Show commit history (DAG traversal from HEAD)", {}, () => logCommand())
  .command(
    "checkout <ref>",
    "Materialize a commit's tree into the working directory",
    (y) =>
      y.positional("ref", {
        describe: "Commit hash or branch name",
        type: "string",
        demandOption: true,
      }),
    notImplemented("checkout"),
  )
  .version(CORE_VERSION)
  .demandCommand(1, "You need to specify a command. Run with --help to see options.")
  .strict()
  .help()
  .parseAsync();
