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

/**
 * Google OAuth Client ID for Google Authentication.
 * Override with `VITE_GOOGLE_CLIENT_ID` in environment variables.
 */
export function getGoogleClientId(): string {
  const raw = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return typeof raw === "string" ? raw.trim() : "";
}

function parseBoolFlag(raw: any, defaultVal = true): boolean {
  if (raw === undefined || raw === null || raw === "") return defaultVal;
  const val = String(raw).trim().toLowerCase();
  return val !== "false" && val !== "0" && val !== "off" && val !== "no";
}

/**
 * Whether Email Sign In is enabled on the login page.
 * Override with `VITE_ENABLE_EMAIL_SIGNIN`.
 * Default: true
 */
export function isEmailSignInEnabled(): boolean {
  return parseBoolFlag(import.meta.env.VITE_ENABLE_EMAIL_SIGNIN, true);
}

/**
 * Whether Email Sign Up is enabled on the registration page.
 * Override with `VITE_ENABLE_EMAIL_SIGNUP`.
 * Default: true
 */
export function isEmailSignUpEnabled(): boolean {
  return parseBoolFlag(import.meta.env.VITE_ENABLE_EMAIL_SIGNUP, true);
}

/**
 * Whether Email OTP authentication is enabled.
 * Override with `VITE_ENABLE_EMAIL_OTP`.
 * Default: true
 */
export function isEmailOtpEnabled(): boolean {
  const specific = import.meta.env.VITE_ENABLE_EMAIL_OTP;
  if (specific !== undefined && specific !== null && specific !== "") {
    return parseBoolFlag(specific, true);
  }
  return true;
}

/**
 * Whether Email Password authentication is enabled.
 * Override with `VITE_ENABLE_EMAIL_PASSWORD`.
 * Default: true
 */
export function isEmailPasswordEnabled(): boolean {
  const specific = import.meta.env.VITE_ENABLE_EMAIL_PASSWORD;
  if (specific !== undefined && specific !== null && specific !== "") {
    return parseBoolFlag(specific, true);
  }
  return true;
}

/**
 * Whether Email Password sign-in is enabled on the login page.
 */
export function isEmailPasswordSignInEnabled(): boolean {
  return isEmailSignInEnabled() && isEmailPasswordEnabled();
}

/**
 * Whether Email OTP sign-in is enabled on the login page.
 */
export function isEmailOtpSignInEnabled(): boolean {
  return isEmailSignInEnabled() && isEmailOtpEnabled();
}

/**
 * Whether Email Password sign-up is enabled on the registration page.
 */
export function isEmailPasswordSignUpEnabled(): boolean {
  return isEmailSignUpEnabled() && isEmailPasswordEnabled();
}

/**
 * Whether Email OTP sign-up is enabled on the registration page.
 */
export function isEmailOtpSignUpEnabled(): boolean {
  return isEmailSignUpEnabled() && isEmailOtpEnabled();
}

/**
 * Master helper for checking if any email authentication is enabled.
 * Default: true
 */
export function isPasswordOtpAuthEnabled(): boolean {
  return isEmailSignInEnabled() || isEmailSignUpEnabled();
}

