import { Box } from "@primer/react";
import { Outlet, useLocation } from "react-router-dom";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { RepoHeader } from "./RepoHeader";
import { Sidebar } from "./Sidebar";

/** App layout: a top repo bar over a sidebar + routed content area. */
export function AppShell() {
  const location = useLocation();
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
          {/* Reset the boundary on navigation so one bad route doesn't stick. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>
  );
}
