import type { GraphDTO, OverviewDTO } from "@gitviz/shared";

/**
 * Thin fetch wrapper for the GitViz HTTP API.
 *
 * Requests are same-origin under `/api`; in development Vite proxies that prefix
 * to the Fastify server (see vite.config.ts), so no host is hardcoded here.
 */

const API_BASE = "/api";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/** Fetches the full commit graph (commits, refs, HEAD). */
export function fetchGraph(): Promise<GraphDTO> {
  return apiGet<GraphDTO>("/graph");
}

/** Fetches the repository overview (name, HEAD, current branch, counts). */
export function fetchOverview(): Promise<OverviewDTO> {
  return apiGet<OverviewDTO>("/overview");
}
