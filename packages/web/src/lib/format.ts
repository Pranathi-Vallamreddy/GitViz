/** Small display helpers shared across views. */

/** Abbreviates a content hash to its first 8 characters (Git-style). */
export function shortHash(id: string): string {
  return id.slice(0, 8);
}

const UNITS: [limit: number, secs: number, label: string][] = [
  [60, 1, "second"],
  [3600, 60, "minute"],
  [86400, 3600, "hour"],
  [2592000, 86400, "day"],
  [31536000, 2592000, "month"],
  [Infinity, 31536000, "year"],
];

/** Formats a Unix-ms timestamp as a relative time, e.g. "3 minutes ago". */
export function relativeTime(timestampMs: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (seconds < 5) return "just now";
  for (const [limit, secs, label] of UNITS) {
    if (seconds < limit) {
      const value = Math.floor(seconds / secs);
      return `${value} ${label}${value === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}
