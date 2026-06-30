import { GitMergeIcon, RepoIcon, type Icon } from "@primer/octicons-react";
import { Box } from "@primer/react";
import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

const ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: RepoIcon, end: true },
  { to: "/network", label: "Network", icon: GitMergeIcon },
];

/** Left navigation rail (GitHub-style), with the active route highlighted. */
export function Sidebar() {
  return (
    <Box
      as="nav"
      aria-label="Primary"
      sx={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid",
        borderColor: "border.default",
        bg: "canvas.default",
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
          <Box
            key={to}
            as={NavLink}
            to={to}
            end={end}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 2,
              py: "6px",
              borderRadius: 2,
              color: "fg.default",
              textDecoration: "none",
              fontSize: 1,
              "&:hover": { bg: "canvas.subtle" },
              "&[aria-current='page']": {
                bg: "accent.subtle",
                color: "accent.fg",
                fontWeight: "bold",
              },
            }}
          >
            <ItemIcon size={16} />
            {label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
