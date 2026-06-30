/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base origin of the GitViz API in production (empty in dev → Vite proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
