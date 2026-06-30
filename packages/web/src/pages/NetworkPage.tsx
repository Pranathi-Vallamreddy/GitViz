import { Box } from "@primer/react";

import { CommitGraph } from "../graph/CommitGraph";

/** Full-bleed commit DAG view. */
export function NetworkPage() {
  return (
    <Box sx={{ height: "100%" }}>
      <CommitGraph />
    </Box>
  );
}
