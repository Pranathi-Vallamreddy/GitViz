import { z } from "zod";

/**
 * Typed, validated runtime configuration.
 *
 * Reads from a local `.env` (if present) and `process.env`, then validates the
 * result with zod so the server fails fast on misconfiguration instead of
 * surfacing `undefined` deep inside a handler.
 */

// Load .env if it exists (Node >= 20.12). Safe to call when the file is absent.
try {
  process.loadEnvFile?.();
} catch {
  // No .env file — rely on the ambient environment. Defaults below cover dev.
}

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type Config = z.infer<typeof ConfigSchema>;

export const config: Config = ConfigSchema.parse(process.env);
