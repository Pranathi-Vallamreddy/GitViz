#!/usr/bin/env node
import { CORE_VERSION } from "@gitviz/core";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { checkoutCommand, commitCommand, initCommand, logCommand } from "./commands.js";

/**
 * `gitviz` CLI — `init`, `commit`, `log`, and `checkout`, all implemented on top
 * of @gitviz/core.
 */

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
    "Restore a branch or commit into the working directory and move HEAD",
    (y) =>
      y
        .positional("ref", {
          describe: "Branch name or commit hash",
          type: "string",
          demandOption: true,
        })
        .option("force", {
          alias: "f",
          describe: "Discard local changes that would be overwritten",
          type: "boolean",
          default: false,
        }),
    (argv) => checkoutCommand(argv.ref, argv.force),
  )
  .version(CORE_VERSION)
  .demandCommand(1, "You need to specify a command. Run with --help to see options.")
  .strict()
  .help()
  .parseAsync();
