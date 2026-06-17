# GitViz

A **Git-inspired visual version control system**. GitViz implements a real
content-addressable object store (blobs / trees / commits keyed by hash), a
commit **DAG** with branching and checkout, and an interactive web UI for
exploring repositories, visualizing the commit graph, and inspecting objects.

> This repository is a from-scratch reimagining — not a fork — built to
> demonstrate systems design, data structures, graph algorithms, and full-stack
> engineering.

## Status

**Phase 0 — scaffold.** The monorepo, toolchain, and package boundaries are in
place. No version-control logic has been implemented yet (see the roadmap).

## Architecture

A TypeScript monorepo managed with **pnpm workspaces** and **TypeScript project
references**.

```
gitviz/
├─ packages/
│  ├─ shared/   @gitviz/shared  — framework-agnostic types shared across all packages
│  ├─ core/     @gitviz/core    — the VCS engine (object store, DAG, diff). No I/O frameworks.
│  ├─ server/   @gitviz/server  — Fastify API exposing the engine + Postgres metadata
│  └─ web/      @gitviz/web     — React + Vite UI (commit graph, explorer, inspector)
└─ apps/
   └─ cli/      @gitviz/cli     — `gitviz` command-line wrapper around the engine
```

**Dependency direction:** `shared` ← `core` ← (`server`, `cli`); `web` depends on
`shared` only. The engine (`core`) never imports a web or server framework, so it
stays unit-testable and reusable from both the API and the CLI.

## Prerequisites

- Node.js >= 20 (developed on 22)
- pnpm 9 (`corepack enable pnpm`, or run via `corepack pnpm@9.15.0 <cmd>`)

## Getting started

```bash
pnpm install        # install all workspaces
pnpm typecheck      # tsc -b across all node packages
pnpm lint           # eslint
pnpm test           # vitest
pnpm build          # build every package

pnpm dev:server     # run the Fastify API in watch mode
pnpm dev:web        # run the Vite dev server
pnpm cli -- --help  # run the CLI
```

## Roadmap

- **Phase 0** ✅ Monorepo scaffold & toolchain
- **Phase 1** Core engine: object model, hashing, store, refs/HEAD, writeTree, commit, log, branch, checkout
- **Phase 2** Tree + line (Myers/LCS) diff; Fastify API; Postgres metadata; seed
- **Phase 3** Web UI: commit-graph visualization, repository explorer, object inspector, branch management
- **Phase 4** Polish: docs, deploy, design write-up
