import type { ObjectDTO } from "@gitviz/shared";
import {
  FileDirectoryIcon,
  FileIcon,
  GitCommitIcon,
  type Icon,
} from "@primer/octicons-react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";

import { useObject } from "../api/queries";
import { Avatar } from "./Avatar";
import { CopyableHash, HashLink } from "./Hash";

const TYPE_META: Record<ObjectDTO["type"], { icon: Icon; color: string }> = {
  commit: { icon: GitCommitIcon, color: "done.fg" },
  tree: { icon: FileDirectoryIcon, color: "attention.fg" },
  blob: { icon: FileIcon, color: "accent.fg" },
};

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 90,
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 6,
        px: 2,
        py: 2,
      }}
    >
      <Text
        sx={{
          fontSize: 0,
          color: "fg.muted",
          fontWeight: 600,
          letterSpacing: "0.03em",
          display: "block",
        }}
      >
        {label}
      </Text>
      <Text sx={{ fontFamily: "mono", fontSize: 1, mt: "2px", display: "block" }}>
        {value}
      </Text>
    </Box>
  );
}

function CommitBody({ object }: { object: Extract<ObjectDTO, { type: "commit" }> }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        <MetaTile label="PARENTS" value={String(object.parents.length)} />
        <MetaTile label="STORAGE" value="loose" />
        <MetaTile label="ENCODING" value="zlib" />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar name={object.author.name} size={24} />
        <Box>
          <Text sx={{ fontSize: 1, display: "block" }}>{object.author.name}</Text>
          <Text sx={{ fontSize: 0, color: "fg.muted" }}>
            {new Date(object.timestamp).toLocaleString()}
          </Text>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 3, fontSize: 1 }}>
        <Text sx={{ width: 56, color: "fg.muted" }}>tree</Text>
        <HashLink id={object.tree} />
      </Box>
      {object.parents.length > 0 && (
        <Box sx={{ display: "flex", gap: 3, fontSize: 1 }}>
          <Text sx={{ width: 56, color: "fg.muted" }}>parents</Text>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {object.parents.map((p) => (
              <HashLink key={p} id={p} />
            ))}
          </Box>
        </Box>
      )}
      <Box
        as="pre"
        sx={{
          m: 0,
          p: 3,
          bg: "canvas.subtle",
          border: "1px solid",
          borderColor: "border.default",
          borderRadius: 6,
          fontSize: 1,
          whiteSpace: "pre-wrap",
          fontFamily: "normal",
        }}
      >
        {object.message}
      </Box>
    </Box>
  );
}

function TreeBody({ object }: { object: Extract<ObjectDTO, { type: "tree" }> }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "border.default", borderRadius: 6 }}>
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
            "&:hover": { bg: "canvas.subtle" },
          }}
        >
          <Box
            sx={{
              color: entry.type === "tree" ? "attention.fg" : "fg.muted",
              display: "flex",
            }}
          >
            {entry.type === "tree" ? (
              <FileDirectoryIcon size={15} />
            ) : (
              <FileIcon size={15} />
            )}
          </Box>
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        <MetaTile label="SIZE" value={`${object.size} B`} />
        <MetaTile label="STORAGE" value="loose" />
        <MetaTile
          label="ENCODING"
          value={object.encoding === "utf8" ? "zlib" : "binary"}
        />
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
            borderRadius: 6,
            fontFamily: "mono",
            fontSize: 0,
            overflow: "auto",
            maxHeight: 420,
          }}
        >
          {object.content}
          {object.truncated && "\n… (truncated)"}
        </Box>
      ) : (
        <Box sx={{ p: 3, color: "fg.muted", fontSize: 1 }}>
          Binary content ({object.size} bytes) — not shown.
        </Box>
      )}
    </Box>
  );
}

/** Fetches and renders any content-addressed object. Shared by the inspector
 *  route and the Objects browser so they look identical. */
export function ObjectView({ hash }: { hash: string }) {
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
      <Box sx={{ p: 1 }}>
        <Text sx={{ color: "danger.fg", display: "block" }}>Could not load object</Text>
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ color: meta.color, display: "flex" }}>
          <TypeIcon size={18} />
        </Box>
        <Heading as="h3" sx={{ fontSize: 2 }}>
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
