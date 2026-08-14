/**
 * Single axios instance for the whole app.
 *
 * Responsibilities kept in one place: attaching the token, turning backend
 * error payloads into readable strings, and signing the user out exactly once
 * when the session expires.
 */

import axios, { AxiosError, type AxiosInstance } from "axios";

import { API_V1 } from "../lib/env";

export const TOKEN_STORAGE_KEY = "access_token";

/** Broadcast when the API rejects the stored token, so AuthContext can react. */
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

const REQUEST_TIMEOUT_MS = 30_000;

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

const api: AxiosInstance = axios.create({
  baseURL: API_V1,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // An expired or revoked token used to leave the app half signed in: the
    // token stayed in storage, every request 401'd, and the UI just showed
    // empty pages. Clearing it once and telling the app is the fix.
    if (error.response?.status === 401 && getStoredToken()) {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Shared SWR fetcher — every page used to define its own copy. */
export const fetcher = <T,>(url: string): Promise<T> => api.get<T>(url).then((res) => res.data);

type BackendError = {
  detail?: string | { msg?: string }[];
};

/**
 * Turn any thrown value into a message worth showing a user.
 *
 * FastAPI returns `{"detail": "..."}` for handled errors and a list of field
 * errors for validation failures; both are unwrapped here so the UI can show
 * what actually went wrong (for example "Insufficient credits") instead of a
 * generic failure notice.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<BackendError>(error)) {
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!error.response) return "Cannot reach the server. Check your connection.";

    const detail = error.response.data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;

    switch (error.response.status) {
      case 401:
        return "Your session has expired. Please sign in again.";
      case 402:
        return "You do not have enough credits for this action.";
      case 403:
        return "You do not have permission to do that.";
      case 404:
        return "Not found.";
      case 409:
        return "That action has already been completed.";
      case 413:
        return "That file is too large.";
      case 429:
        return "Too many requests. Please slow down.";
      case 503:
        return "The service is temporarily unavailable. Please try again shortly.";
      default:
        return fallback;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default api;
