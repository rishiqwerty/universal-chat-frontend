const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_STUDIO_POLLING_INTERVAL_SECONDS = 3;
const DEFAULT_BALANCE_CHECK_INTERVAL_SECONDS = 30;

/**
 * API server origin only (no trailing slash). The axios client adds `/api/v1` to every request.
 * Override with `VITE_API_BASE_URL` in `.env`, `.env.development`, `.env.production`, etc.
 * Example: `http://localhost:8000`
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length > 0) {
    return trimmed.replace(/\/+$/, "");
  }
  return DEFAULT_API_BASE_URL;
}

/**
 * Polling interval for checking studio image status (in seconds).
 * Override with `VITE_STUDIO_POLLING_INTERVAL_SECONDS` in environment variables.
 * Default: 3 (3 seconds)
 */
export function getStudioPollingInterval(): number {
  const raw = import.meta.env.VITE_STUDIO_POLLING_INTERVAL_SECONDS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_STUDIO_POLLING_INTERVAL_SECONDS;
}

/**
 * Polling interval for checking user credit balance (in seconds).
 * Override with `VITE_BALANCE_CHECK_INTERVAL_SECONDS` in environment variables.
 * Default: 30 (30 seconds)
 */
export function getBalanceCheckInterval(): number {
  const raw = import.meta.env.VITE_BALANCE_CHECK_INTERVAL_SECONDS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_BALANCE_CHECK_INTERVAL_SECONDS;
}



