import { useEffect, useRef, useState, useCallback } from "react";
import { getGoogleClientId } from "../config";

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  text?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleAuthButton({
  onSuccess,
  onError,
  disabled,
  text = "Continue with Google",
}: GoogleAuthButtonProps) {
  const gsiOverlayRef = useRef<HTMLDivElement>(null);
  const clientId = getGoogleClientId();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 100, y: 20 });
  const [popupFailed, setPopupFailed] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError("Failed to load Google Auth SDK");
    document.body.appendChild(script);
  }, [clientId, onError]);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !window.google?.accounts?.id || !gsiOverlayRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError("Google Sign-In credential not received");
          }
        },
      });

      gsiOverlayRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(gsiOverlayRef.current, {
        theme: "filled_black",
        size: "large",
        width: 400,
        text: "continue_with",
        shape: "rectangular",
      });
    } catch (err: any) {
      console.error("Google Auth initialization error:", err);
    }
  }, [scriptLoaded, clientId, onSuccess, onError]);

  // Fallback: open Google OAuth popup directly from our origin (works in strict browsers)
  const handleFallbackClick = useCallback(() => {
    if (!clientId || disabled) return;

    // Build a nonce for security
    const nonce = crypto.randomUUID?.() || Math.random().toString(36).slice(2);

    // Open popup FIRST (synchronously in click handler = trusted user gesture)
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const redirectUri = window.location.origin + "/login";
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=id_token&` +
      `scope=openid%20email%20profile&` +
      `nonce=${nonce}&` +
      `prompt=select_account`;

    const popup = window.open(
      authUrl,
      "google-auth-popup",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup) {
      onError("Popup blocked by browser. Please allow popups for this site.");
      return;
    }

    // Poll the popup for the redirect with the id_token fragment
    const pollTimer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer);
          return;
        }
        // Check if popup has redirected back to our origin
        if (popup.location?.origin === window.location.origin) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(pollTimer);

          if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const idToken = params.get("id_token");
            if (idToken) {
              onSuccess(idToken);
            } else {
              const error = params.get("error");
              onError(error || "Google Sign-In failed. No token received.");
            }
          }
        }
      } catch {
        // Cross-origin access error — popup hasn't redirected back yet, keep polling
      }
    }, 500);

    // Safety timeout: stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollTimer);
      try {
        if (!popup.closed) popup.close();
      } catch { /* ignore */ }
    }, 300000);
  }, [clientId, disabled, onSuccess, onError]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => onError("Google Client ID is missing. Set VITE_GOOGLE_CLIENT_ID in environment variables.")}
        disabled={disabled}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-input bg-elevated text-sm font-medium text-textPrimary transition-colors hover:bg-border disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        {text}
      </button>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-input select-none cursor-pointer"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursorPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setIsHovered(true);
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Visual Custom 3D Glass Button */}
      <div
        className={`relative flex h-11 w-full items-center justify-center gap-3 rounded-input border border-black/20 bg-gradient-to-b from-[#e5ff33] via-primary to-[#b8da00] px-4 text-sm font-black text-background transition-all duration-200 ease-out ${
          isPressed
            ? "scale-[0.96] shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
            : isHovered
            ? "scale-[1.02] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_0_30px_rgba(217,255,0,0.55)]"
            : "scale-100 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.25),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_4px_16px_rgba(0,0,0,0.2)]"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* Curved Top Glass Lens Highlight */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[48%] rounded-t-input bg-gradient-to-b from-white/40 via-white/15 to-transparent transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-50"
          }`}
        />

        {/* Cursor-Following Specular Spotlight */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 90px at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.15) 40%, transparent 80%)`,
          }}
        />

        {/* Google Icon Badge */}
        <div
          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-1 ring-black/15 transition-transform duration-200 ${
            isPressed ? "scale-95" : isHovered ? "scale-110 rotate-6" : "scale-100"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        </div>

        {/* Text Label */}
        <span className="relative z-10 font-black tracking-wide text-background drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
          {text}
        </span>
      </div>

      {/* GSI Native Button Overlay — primary method (Chrome, Firefox, Safari) */}
      {!popupFailed && (
        <div
          ref={gsiOverlayRef}
          onClick={() => {
            // If the GSI iframe popup fails, detect it after a short delay and switch to fallback
            setTimeout(() => {
              // Check if no credential callback was fired — means popup likely failed
              setPopupFailed(true);
            }, 3000);
          }}
          className="absolute inset-0 z-30 opacity-[0.0001] cursor-pointer overflow-hidden flex justify-center items-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:cursor-pointer"
        />
      )}

      {/* Fallback click target — for browsers that block cross-origin iframe popups (Helium, Brave, Arc) */}
      {popupFailed && (
        <div
          onClick={handleFallbackClick}
          className="absolute inset-0 z-30 cursor-pointer"
        />
      )}
    </div>
  );
}
