import type { GraphDTO, ObjectDTO, OverviewDTO } from "@gitviz/shared";

/**
 * Thin fetch wrapper for the GitViz HTTP API.
 *
 * In development, requests are same-origin under `/api` and Vite proxies them to
 * the Fastify server (see vite.config.ts). In production set `VITE_API_URL` to
 * the deployed API origin (e.g. https://gitviz-api.onrender.com) at build time.
 */

const API_BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error("Cannot reach the GitViz API. Is the server running?");
  }
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

/** Fetches and decodes a content-addressed object (commit / tree / blob). */
export function fetchObject(hash: string): Promise<ObjectDTO> {
  return apiGet<ObjectDTO>(`/objects/${hash}`);
}
