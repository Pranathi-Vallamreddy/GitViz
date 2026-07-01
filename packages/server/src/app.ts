import cors from "@fastify/cors";
import {
  CORE_VERSION,
  GitVizError,
  InvalidObjectIdError,
  NotARepositoryError,
  ObjectNotFoundError,
} from "@gitviz/core";
import { GITVIZ_VERSION } from "@gitviz/shared";
import Fastify, { type FastifyInstance } from "fastify";

import { config } from "./config.js";
import { graphRoutes } from "./routes/graph.js";
import { objectRoutes } from "./routes/objects.js";
import { overviewRoutes } from "./routes/overview.js";

/**
 * Builds and configures the Fastify application without starting it.
 *
 * Kept separate from `index.ts` so integration tests can spin up the app
 * in-process via `app.inject()` without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  // CORS: "*" (public demo), a single origin, or a comma-separated allowlist
  // (e.g. a Vercel production + preview domain).
  const corsOrigin =
    config.CORS_ORIGIN === "*"
      ? true
      : config.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(cors, { origin: corsOrigin });

  // Map known engine errors to appropriate HTTP statuses.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof NotARepositoryError) {
      return reply.status(409).send({ error: error.message });
    }
    if (error instanceof ObjectNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof InvalidObjectIdError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof GitVizError) {
      return reply.status(400).send({ error: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  });

  // Liveness / version endpoint.
  app.get("/health", async () => ({
    status: "ok",
    version: GITVIZ_VERSION,
    engine: CORE_VERSION,
  }));

  // Read-only repository API.
  await app.register(graphRoutes, { prefix: "/api" });
  await app.register(overviewRoutes, { prefix: "/api" });
  await app.register(objectRoutes, { prefix: "/api" });

  return app;
}
