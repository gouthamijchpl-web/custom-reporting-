/// <reference types="vite/client" />

/** Environment variables the application reads. See .env.example. */
interface ImportMetaEnv {
  /** Base path for API calls, e.g. "/api/v1". */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
