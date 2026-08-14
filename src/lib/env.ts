/**
 * Environment configuration.
 *
 * Everything the app needs from the environment is read and validated here, so
 * a missing variable fails loudly at startup instead of producing a confusing
 * request to `undefined/api/v1/...` later on.
 */

function required(name: keyof ImportMetaEnv, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

/** Backend origin, normalised without a trailing slash. */
export const API_URL = required("VITE_API_URL", import.meta.env.VITE_API_URL).replace(/\/+$/, "");

/** Versioned REST prefix. */
export const API_V1 = `${API_URL}/api/v1`;

/**
 * WebSocket origin, derived from the API URL.
 *
 * It used to be hard-coded to `localhost:8000` or `api.multiaimodel.com`, which
 * broke on every other host (staging, a LAN IP, a preview deployment).
 */
export const WS_URL = API_URL.replace(/^http/, "ws");

/**
 * Google OAuth client id.
 *
 * Public by design (it is visible in the sign-in request), but it belongs in
 * configuration so staging and production can use different OAuth clients. The
 * literal is the value that used to be hard-coded in main.tsx, kept as a default
 * so existing deployments keep working without a new environment variable.
 */
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "215092121758-6svpfnkvc2vqpi9uf1uchh98phk11tpt.apps.googleusercontent.com";

export const IS_DEV = import.meta.env.DEV;

/** Limits mirrored from the backend so the UI can reject files before uploading. */
export const UPLOAD_LIMITS = {
  maxFileSizeMb: 10,
  maxFiles: 5,
} as const;

export const MAX_FILE_SIZE_BYTES = UPLOAD_LIMITS.maxFileSizeMb * 1024 * 1024;
