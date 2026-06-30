/** Helpers for deriving consistent avatars from author names. */

/** Up to two uppercase initials, e.g. "Dana Whitfield" -> "DW", "Pranathi" -> "PR". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Muted, GitHub-ish accent colors that read well on a dark surface.
const AVATAR_COLORS = [
  "#4c79e6",
  "#3aa675",
  "#a371f7",
  "#db6d28",
  "#c96198",
  "#cca700",
  "#2eb6bf",
  "#e5534b",
];

/** Deterministic avatar background color from a name. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}
