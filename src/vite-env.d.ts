/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend, without a trailing slash (e.g. https://api.example.com). */
  readonly VITE_API_URL: string;
  /** Google OAuth client id used by the sign-in button. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
