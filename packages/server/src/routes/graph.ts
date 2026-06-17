import type { GraphDTO } from "@gitviz/shared";
import type { FastifyInstance } from "fastify";

import { toGraphDTO } from "../mappers.js";
import { openRepository } from "../repo-context.js";

/**
 * Commit-graph routes. Registered under the `/api` prefix.
 *
 * `GET /api/graph` returns the entire commit DAG, branch refs, and HEAD — the
 * single payload that powers the graph, branch, and HEAD-indicator views.
 */
export async function graphRoutes(app: FastifyInstance): Promise<void> {
  app.get("/graph", async (): Promise<GraphDTO> => {
    const repo = openRepository();
    return toGraphDTO(await repo.graph());
  });
}
