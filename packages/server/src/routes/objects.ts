import { asObjectId } from "@gitviz/core";
import type { ObjectDTO } from "@gitviz/shared";
import type { FastifyInstance } from "fastify";

import { toObjectDTO } from "../mappers.js";
import { openRepository } from "../repo-context.js";

/**
 * `GET /api/objects/:hash` — fetch and decode any content-addressed object
 * (commit, tree, or blob). This is what makes the Merkle DAG explorable: a
 * commit's `tree`, a tree's entries, and a blob's bytes are all reachable by
 * following hashes.
 *
 * Invalid hashes → 400, unknown hashes → 404 (via the global error handler).
 */
export async function objectRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { hash: string } }>(
    "/objects/:hash",
    async (request): Promise<ObjectDTO> => {
      const id = asObjectId(request.params.hash);
      const repo = openRepository();
      return toObjectDTO(id, await repo.objects.get(id));
    },
  );
}
