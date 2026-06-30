import type { GraphDTO, OverviewDTO } from "@gitviz/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchGraph, fetchOverview } from "./client";

/** Query keys, centralized so invalidation stays consistent. */
export const queryKeys = {
  graph: ["graph"] as const,
  overview: ["overview"] as const,
};

/**
 * Loads the commit graph. The graph changes whenever a commit/branch/HEAD moves,
 * so unlike immutable objects it is refetched on demand (e.g. a Refresh button)
 * rather than cached forever.
 */
export function useGraph(): UseQueryResult<GraphDTO, Error> {
  return useQuery({ queryKey: queryKeys.graph, queryFn: fetchGraph });
}

/** Loads the repository overview (name, HEAD, current branch, counts). */
export function useOverview(): UseQueryResult<OverviewDTO, Error> {
  return useQuery({ queryKey: queryKeys.overview, queryFn: fetchOverview });
}
