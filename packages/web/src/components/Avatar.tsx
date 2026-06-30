import { Box } from "@primer/react";

import { avatarColor, initials } from "../lib/avatar";

/** A small round initials avatar with a deterministic color. */
export function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  // Note: numeric sx values for fontSize/width/height map to Primer's theme
  // *scales*, not pixels — so these are explicit px strings on purpose.
  return (
    <Box
      title={name}
      sx={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        borderRadius: "50%",
        bg: avatarColor(name),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.max(8, Math.round(size * 0.4))}px`,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {initials(name)}
    </Box>
  );
}
