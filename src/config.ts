const DEFAULT_API_BASE_URL = "http://localhost:8000";

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
