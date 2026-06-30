import type { CommitDTO } from "@gitviz/shared";
import { FileDirectoryIcon, GitCommitIcon, TagIcon, XIcon } from "@primer/octicons-react";
import { Box, IconButton, Label, Text } from "@primer/react";
import { Link } from "react-router-dom";

import { relativeTime } from "../lib/format";
import { Avatar } from "./Avatar";
import { CopyableHash, HashLink } from "./Hash";

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: "5px", fontSize: 1 }}>
      <Box sx={{ width: 16, color: "fg.muted", display: "flex" }}>{icon}</Box>
      <Text sx={{ width: 56, color: "fg.muted", flexShrink: 0 }}>{label}</Text>
      <Box sx={{ minWidth: 0, display: "flex", gap: 2, flexWrap: "wrap" }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * Canonical commit-detail view, shared by the History details column and the
 * Network inspector so they stay visually identical.
 */
export function CommitDetails({
  commit,
  refs,
  isHead,
  onClose,
}: {
  commit: CommitDTO;
  refs: string[];
  isHead?: boolean;
  onClose?: () => void;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Avatar name={commit.author.name} size={32} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Text sx={{ fontSize: 1, fontWeight: 600, display: "block" }}>
            {commit.author.name}
          </Text>
          <Text sx={{ fontSize: 0, color: "fg.muted" }}>{commit.author.email}</Text>
        </Box>
        {onClose && (
          <IconButton
            aria-label="Close"
            size="small"
            variant="invisible"
            icon={XIcon}
            onClick={onClose}
          />
        )}
      </Box>

      {(isHead || refs.length > 0) && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {isHead && <Label variant="severe">HEAD</Label>}
          {refs.map((name) => (
            <Label key={name} variant="accent">
              {name}
            </Label>
          ))}
        </Box>
      )}

      <Text
        sx={{
          fontSize: 1,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          color: "fg.default",
        }}
      >
        {commit.message}
      </Text>

      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "border.muted",
          pt: 2,
        }}
      >
        <MetaRow icon={<GitCommitIcon size={14} />} label="commit">
          <CopyableHash id={commit.id} />
        </MetaRow>
        <MetaRow icon={<GitCommitIcon size={14} />} label="parents">
          {commit.parents.length === 0 ? (
            <Text sx={{ color: "fg.muted", fontSize: 0 }}>root commit</Text>
          ) : (
            commit.parents.map((p) => <HashLink key={p} id={p} />)
          )}
        </MetaRow>
        <MetaRow icon={<FileDirectoryIcon size={14} />} label="tree">
          <HashLink id={commit.tree} />
        </MetaRow>
        <MetaRow icon={<TagIcon size={14} />} label="date">
          <Text sx={{ fontSize: 0, color: "fg.muted" }}>
            {new Date(commit.timestamp).toLocaleString()} ·{" "}
            {relativeTime(commit.timestamp)}
          </Text>
        </MetaRow>
      </Box>

      <Box
        as={Link}
        to={`/objects/${commit.id}`}
        sx={{ fontSize: 1, color: "accent.fg", textDecoration: "none" }}
      >
        Open in object inspector →
      </Box>
    </Box>
  );
}
