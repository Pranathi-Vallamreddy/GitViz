import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";
import { RepoViewProvider } from "./app/RepoViewContext";
import { HistoryPage } from "./pages/HistoryPage";
import { NetworkPage } from "./pages/NetworkPage";
import { ObjectInspectorPage } from "./pages/ObjectInspectorPage";
import { ObjectsPage } from "./pages/ObjectsPage";
import { OverviewPage } from "./pages/OverviewPage";

/**
 * Application root: client-side routing inside the repo shell. HashRouter keeps
 * deep links working on static hosts (Vercel) without server rewrite rules.
 */
export function App() {
  return (
    <RepoViewProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="commits" element={<HistoryPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="objects" element={<ObjectsPage />} />
            <Route path="objects/:hash" element={<ObjectInspectorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </RepoViewProvider>
  );
}
