import { Box } from "@primer/react";
import type { ReactNode } from "react";

interface PanelProps {
  title?: ReactNode;
  /** Right-aligned accessory in the header (e.g. a count or action). */
  action?: ReactNode;
  /** Remove body padding (for tables/lists that manage their own spacing). */
  flush?: boolean;
  children: ReactNode;
}

/**
 * The single bordered container used across the app, so every card/list/table
 * shares the same border, radius, and header styling.
 */
export function Panel({ title, action, flush, children }: PanelProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 6,
        bg: "canvas.default",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {title !== undefined && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            height: 40,
            bg: "canvas.subtle",
            borderBottom: "1px solid",
            borderColor: "border.default",
            fontSize: 1,
            fontWeight: 600,
            color: "fg.default",
          }}
        >
          <Box
            sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 2 }}
          >
            {title}
          </Box>
          {action}
        </Box>
      )}
      <Box sx={{ p: flush ? 0 : 3 }}>{children}</Box>
    </Box>
  );
}
