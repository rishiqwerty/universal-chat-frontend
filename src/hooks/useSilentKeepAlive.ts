import { useEffect, useRef } from "react";
import { pingServerHealth } from "../api/api";

const IDLE_WAKE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const ACTIVE_HEARTBEAT_INTERVAL_MS = 4.5 * 60 * 1000; // 4.5 minutes (prevents GCP 15m scale-to-zero)

/**
 * Completely silent background wake-up and keep-alive hook.
 * - Silently wakes the GCP server when user returns to tab/app after idle time.
 * - Silently keeps server warm with a lightweight heartbeat while tab is active.
 * - Captures mobile visibility changes, phone unlocks (pageshow), and first interactions.
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
    // 1. Initial wake-up on load
    silentPing();

    // 2. Listen for user returning to tab or unlocking mobile device
    const handleWakeTrigger = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActiveTimestamp.current;
        if (elapsed >= IDLE_WAKE_THRESHOLD_MS) {
          silentPing();
        }
      }
    };

    // 3. User interaction wake-up (touch on mobile / mouse on desktop) after idle
    const handleUserInteraction = () => {
      const elapsed = Date.now() - lastActiveTimestamp.current;
      if (elapsed >= IDLE_WAKE_THRESHOLD_MS) {
        silentPing();
      }
    };

    document.addEventListener("visibilitychange", handleWakeTrigger);
    window.addEventListener("focus", handleWakeTrigger);
    window.addEventListener("pageshow", handleWakeTrigger);
    window.addEventListener("online", handleWakeTrigger);
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });

    // 4. Periodic background heartbeat while tab remains open
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        silentPing();
      }
    }, ACTIVE_HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleWakeTrigger);
      window.removeEventListener("focus", handleWakeTrigger);
      window.removeEventListener("pageshow", handleWakeTrigger);
      window.removeEventListener("online", handleWakeTrigger);
      window.removeEventListener("pointerdown", handleUserInteraction);
      clearInterval(heartbeatInterval);
    };
  }, []);
}

