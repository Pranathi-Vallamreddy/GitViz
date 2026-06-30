/**
 * Deterministic per-lane colors, so each branch line in the railroad reads as a
 * distinct color. GitHub-ish palette; lanes beyond its length wrap around.
 */
const LANE_PALETTE = [
  "#58a6ff",
  "#3fb950",
  "#bc8cff",
  "#f0883e",
  "#db61a2",
  "#e3b341",
  "#39c5cf",
  "#f85149",
];

export function laneColor(lane: number): string {
  return LANE_PALETTE[lane % LANE_PALETTE.length]!;
}
