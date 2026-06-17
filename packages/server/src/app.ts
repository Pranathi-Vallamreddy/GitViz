import cors from "@fastify/cors";
import { CORE_VERSION } from "@gitviz/core";
import { GITVIZ_VERSION } from "@gitviz/shared";
import Fastify, { type FastifyInstance } from "fastify";

import { config } from "./config.js";

/**
 * Builds and configures the Fastify application without starting it.
 *
 * Kept separate from `index.ts` so integration tests (Phase 2) can spin up the
 * app in-process via `app.inject()` without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, { origin: config.CORS_ORIGIN });

  // Liveness / version endpoint. Engine routes are added in Phase 2.
  app.get("/health", async () => ({
    status: "ok",
    version: GITVIZ_VERSION,
    engine: CORE_VERSION,
  }));

  return app;
}
