import type { ObjectDTO } from "@gitviz/shared";
import {
  FileDirectoryIcon,
  FileIcon,
  GitCommitIcon,
  type Icon,
} from "@primer/octicons-react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";
import { useParams } from "react-router-dom";

import { useObject } from "../api/queries";
import { CopyableHash, HashLink } from "../components/Hash";

const TYPE_META: Record<ObjectDTO["type"], { icon: Icon; color: string }> = {
  commit: { icon: GitCommitIcon, color: "done.fg" },
  tree: { icon: FileDirectoryIcon, color: "attention.fg" },
  blob: { icon: FileIcon, color: "accent.fg" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 3, py: "6px", fontSize: 1 }}>
      <Text sx={{ width: 90, color: "fg.muted", flexShrink: 0 }}>{label}</Text>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function CommitBody({ object }: { object: Extract<ObjectDTO, { type: "commit" }> }) {
  return (
    <Box>
      <Row label="tree">
        <HashLink id={object.tree} />
      </Row>
      <Row label="parents">
        {object.parents.length === 0 ? (
          <Text sx={{ color: "fg.muted" }}>none (root commit)</Text>
        ) : (
          <Box sx={{ display: "flex", gap: 2 }}>
            {object.parents.map((p) => (
              <HashLink key={p} id={p} />
            ))}
          </Box>
        )}
      </Row>
      <Row label="author">
        <Text>
          {object.author.name} &lt;{object.author.email}&gt;
        </Text>
      </Row>
      <Row label="date">
        <Text sx={{ fontFamily: "mono" }}>
          {new Date(object.timestamp).toISOString()}
        </Text>
      </Row>
      <Box
        sx={{
          mt: 2,
          p: 3,
          bg: "canvas.subtle",
          border: "1px solid",
          borderColor: "border.default",
          borderRadius: 2,
          whiteSpace: "pre-wrap",
          fontSize: 1,
        }}
      >
        {object.message}
      </Box>
    </Box>
  );
}

function TreeBody({ object }: { object: Extract<ObjectDTO, { type: "tree" }> }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "border.default", borderRadius: 2 }}>
      {object.entries.map((entry, i) => (
        <Box
          key={entry.name}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 2,
            borderTop: i === 0 ? "none" : "1px solid",
            borderColor: "border.muted",
          }}
        >
          {entry.type === "tree" ? (
            <FileDirectoryIcon size={16} />
          ) : (
            <FileIcon size={16} />
          )}
          <Text sx={{ flex: 1, fontSize: 1 }}>{entry.name}</Text>
          <Label variant="secondary">{entry.type}</Label>
          <HashLink id={entry.hash} />
        </Box>
      ))}
      {object.entries.length === 0 && (
        <Box sx={{ p: 3, color: "fg.muted" }}>Empty tree</Box>
      )}
    </Box>
  );
}

function BlobBody({ object }: { object: Extract<ObjectDTO, { type: "blob" }> }) {
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2, color: "fg.muted", fontSize: 0 }}>
        <Text>{object.size} bytes</Text>
        <Text>· {object.encoding}</Text>
        {object.truncated && <Text>· truncated</Text>}
      </Box>
      {object.encoding === "utf8" ? (
        <Box
          as="pre"
          sx={{
            m: 0,
            p: 3,
            bg: "canvas.subtle",
            border: "1px solid",
            borderColor: "border.default",
            borderRadius: 2,
            fontFamily: "mono",
            fontSize: 0,
            overflow: "auto",
            maxHeight: 480,
          }}
        >
          {object.content}
        </Box>
      ) : (
        <Box sx={{ p: 3, color: "fg.muted", fontSize: 1 }}>
          Binary content ({object.size} bytes) — not shown.
        </Box>
      )}
    </Box>
  );
}

/** Inspects a single content-addressed object, with clickable hash links. */
export function ObjectInspectorPage() {
  const { hash = "" } = useParams();
  const { data, isPending, isError, error } = useObject(hash);

  if (isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }
  if (isError) {
    return (
      <Box sx={{ p: 4 }}>
        <Text sx={{ color: "danger.fg" }}>Could not load object</Text>
        <Box sx={{ mt: 1, fontFamily: "mono", fontSize: 0, color: "fg.muted" }}>
          {hash}
        </Box>
        <Box sx={{ mt: 1, fontSize: 1 }}>{error.message}</Box>
      </Box>
    );
  }

  const meta = TYPE_META[data.type];
  const TypeIcon = meta.icon;

  return (
    <Box sx={{ p: 4, maxWidth: 900, display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ color: meta.color, display: "flex" }}>
          <TypeIcon size={20} />
        </Box>
        <Heading as="h2" sx={{ fontSize: 3 }}>
          {data.type}
        </Heading>
        <Label variant="secondary">content-addressed</Label>
      </Box>

      <CopyableHash id={data.id} />

      {data.type === "commit" && <CommitBody object={data} />}
      {data.type === "tree" && <TreeBody object={data} />}
      {data.type === "blob" && <BlobBody object={data} />}
    </Box>
  );
}
