import type { Icon } from "@primer/octicons-react";
import { Box, Text } from "@primer/react";

/** A compact statistic tile: icon + label on top, large mono value below. */
export function StatCard({
  icon: StatIcon,
  label,
  value,
  sub,
}: {
  icon: Icon;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 6,
        bg: "canvas.default",
        px: 3,
        py: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          color: "fg.muted",
          mb: 2,
        }}
      >
        <StatIcon size={15} />
        <Text sx={{ fontSize: 0, fontWeight: 600, letterSpacing: "0.03em" }}>
          {label.toUpperCase()}
        </Text>
      </Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <Text sx={{ fontFamily: "mono", fontSize: 5, fontWeight: 600, lineHeight: 1 }}>
          {value}
        </Text>
        {sub && <Text sx={{ fontSize: 0, color: "fg.muted" }}>{sub}</Text>}
      </Box>
    </Box>
  );
}
