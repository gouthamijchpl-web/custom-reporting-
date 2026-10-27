/// <reference types="vite/client" />

/** Environment variables the application reads. See the repository-root .env.example. */
interface ImportMetaEnv {
  /** Base path for API calls, e.g. "/api/v1". */
  readonly VITE_API_BASE_URL?: string;
  /** Regional Zoho Accounts endpoint used as the connection-form default. */
  readonly VITE_ZOHO_ACCOUNTS_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
