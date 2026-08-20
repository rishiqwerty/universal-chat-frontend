import { useEffect, useRef } from "react";
import { pingServerHealth } from "../api/api";

const IDLE_WAKE_THRESHOLD_MS = 4 * 60 * 1000; // 4 minutes
const ACTIVE_HEARTBEAT_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes

/**
 * Completely silent background wake-up and keep-alive hook.
 * - Silently wakes the server when user returns to tab after idle time.
 * - Silently keeps server warm with a lightweight heartbeat while tab is active.
 * - Zero UI indicators, banners, or badges.
 */
export function useSilentKeepAlive() {
  const lastActiveTimestamp = useRef<number>(Date.now());
  const isPinging = useRef<boolean>(false);

  const silentPing = async () => {
    if (isPinging.current) return;
    isPinging.current = true;
    lastActiveTimestamp.current = Date.now();
    try {
      await pingServerHealth();
    } catch {
      // Completely silent — ignore any errors
    } finally {
      isPinging.current = false;
    }
  };

  useEffect(() => {
    // 1. Listen for user returning to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActiveTimestamp.current;
        if (elapsed >= IDLE_WAKE_THRESHOLD_MS) {
          silentPing();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // 2. Periodic background heartbeat while tab remains open
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        silentPing();
      }
    }, ACTIVE_HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      clearInterval(heartbeatInterval);
    };
  }, []);
}
