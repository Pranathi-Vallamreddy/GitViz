import { Box } from "@primer/react";
import { useParams } from "react-router-dom";

import { ObjectView } from "../components/ObjectView";

/** Focused inspector for a single object, reachable from any hash link. */
export function ObjectInspectorPage() {
  const { hash = "" } = useParams();
  return (
    <Box sx={{ p: 4, maxWidth: 880 }}>
      <ObjectView hash={hash} />
    </Box>
  );
}
