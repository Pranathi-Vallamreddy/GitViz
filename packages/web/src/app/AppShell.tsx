import { Box } from "@primer/react";
import { Outlet } from "react-router-dom";

import { RepoHeader } from "./RepoHeader";
import { Sidebar } from "./Sidebar";

/** App layout: a top repo bar over a sidebar + routed content area. */
export function AppShell() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bg: "canvas.default",
      }}
    >
      <RepoHeader />
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <Box sx={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
