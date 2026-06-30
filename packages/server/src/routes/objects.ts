import { InvalidObjectIdError, ObjectNotFoundError } from "@gitviz/core";
import type { ObjectDTO } from "@gitviz/shared";
import type { FastifyInstance } from "fastify";

import { toObjectDTO } from "../mappers.js";
import { openRepository } from "../repo-context.js";

/** A full SHA-256 id or an abbreviated hex prefix (Git-style, >= 4 chars). */
const HASH_OR_PREFIX = /^[0-9a-f]{4,64}$/i;

/**
 * `GET /api/objects/:hash` — fetch and decode any content-addressed object
 * (commit, tree, or blob). Accepts a full hash or an abbreviated prefix, like
 * Git. This is what makes the Merkle DAG explorable: a commit's `tree`, a tree's
 * entries, and a blob's bytes are all reachable by following hashes.
 *
 * Malformed input → 400; unknown/ambiguous hash → 404.
 */
export async function objectRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { hash: string } }>(
    "/objects/:hash",
    async (request): Promise<ObjectDTO> => {
      const raw = request.params.hash;
      if (!HASH_OR_PREFIX.test(raw)) {
        throw new InvalidObjectIdError(raw);
      }
      const repo = openRepository();
      const id = await repo.objects.resolveId(raw);
      if (!id) {
        throw new ObjectNotFoundError(raw);
      }
      return toObjectDTO(id, await repo.objects.get(id));
    },
  );
}
