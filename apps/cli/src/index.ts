#!/usr/bin/env node
import { CORE_VERSION } from "@gitviz/core";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

/**
 * `gitviz` CLI — command surface only.
 *
 * Phase 0 wires up the command names and help output so the UX shape is locked
 * in. Each handler is a stub until the engine lands in Phase 1; they print a
 * notice instead of performing version-control operations.
 */

const notImplemented = (command: string) => () => {
  console.log(`gitviz: '${command}' is not implemented yet (engine arrives in Phase 1).`);
};

await yargs(hideBin(process.argv))
  .scriptName("gitviz")
  .usage("$0 <command> [options]")
  .command("init", "Initialize a new GitViz repository", {}, notImplemented("init"))
  .command(
    "add <pathspec>",
    "Stage file changes",
    (y) =>
      y.positional("pathspec", {
        describe: "File or directory to stage",
        type: "string",
        demandOption: true,
      }),
    notImplemented("add"),
  )
  .command(
    "commit",
    "Record staged changes as a new commit",
    (y) =>
      y.option("message", {
        alias: "m",
        describe: "Commit message",
        type: "string",
        demandOption: true,
      }),
    notImplemented("commit"),
  )
  .command(
    "log",
    "Show commit history (DAG traversal from HEAD)",
    {},
    notImplemented("log"),
  )
  .command(
    "branch [name]",
    "List or create branches",
    (y) => y.positional("name", { describe: "New branch name", type: "string" }),
    notImplemented("branch"),
  )
  .command(
    "switch <name>",
    "Switch HEAD to another branch",
    (y) =>
      y.positional("name", {
        describe: "Branch to switch to",
        type: "string",
        demandOption: true,
      }),
    notImplemented("switch"),
  )
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
