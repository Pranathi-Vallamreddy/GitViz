import { BaseStyles, ThemeProvider } from "@primer/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider colorMode="dark">
        <BaseStyles>
          <App />
        </BaseStyles>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
