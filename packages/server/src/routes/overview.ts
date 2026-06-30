import type { OverviewDTO } from "@gitviz/shared";
import type { FastifyInstance } from "fastify";

import { toOverviewDTO } from "../mappers.js";
import { openRepository } from "../repo-context.js";

/**
 * `GET /api/overview` — repository summary (name, HEAD, current branch, and
 * commit/branch/object counts) for the overview header and page.
 */
export async function overviewRoutes(app: FastifyInstance): Promise<void> {
  app.get("/overview", async (): Promise<OverviewDTO> => {
    const repo = openRepository();
    return toOverviewDTO(await repo.overview());
  });
}
