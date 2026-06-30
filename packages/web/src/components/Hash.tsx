import { CheckIcon, CopyIcon } from "@primer/octicons-react";
import { Box, IconButton, Text } from "@primer/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { shortHash } from "../lib/format";

/** A monospace short-hash that links into the object inspector. */
export function HashLink({ id, color = "accent.fg" }: { id: string; color?: string }) {
  return (
    <Box
      as={Link}
      to={`/objects/${id}`}
      sx={{ fontFamily: "mono", fontSize: 0, color, textDecoration: "none" }}
    >
      {shortHash(id)}
    </Box>
  );
}

/** The full hash shown in monospace with a copy-to-clipboard button. */
export function CopyableHash({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <Text
        sx={{
          fontFamily: "mono",
          fontSize: 1,
          color: "fg.muted",
          overflowWrap: "anywhere",
        }}
      >
        {id}
      </Text>
      <IconButton
        aria-label="Copy hash"
        size="small"
        variant="invisible"
        icon={copied ? CheckIcon : CopyIcon}
        onClick={() => {
          void navigator.clipboard?.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      />
    </Box>
  );
}
