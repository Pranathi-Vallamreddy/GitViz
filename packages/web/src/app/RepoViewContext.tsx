import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Cross-view UI state. Currently the selected branch, which acts as a read-only
 * "view filter" (it re-roots the history/network views) — it never mutates the
 * server's repository.
 */
interface RepoViewState {
  /** The branch the user is viewing, or null to view all refs. */
  selectedBranch: string | null;
  setSelectedBranch: (branch: string | null) => void;
}

const RepoViewContext = createContext<RepoViewState | undefined>(undefined);

export function RepoViewProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const value = useMemo(() => ({ selectedBranch, setSelectedBranch }), [selectedBranch]);
  return <RepoViewContext.Provider value={value}>{children}</RepoViewContext.Provider>;
}

export function useRepoView(): RepoViewState {
  const ctx = useContext(RepoViewContext);
  if (!ctx) throw new Error("useRepoView must be used within RepoViewProvider");
  return ctx;
}
