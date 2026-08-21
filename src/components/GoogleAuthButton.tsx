import { useEffect, useRef, useState, useCallback } from "react";
import { getGoogleClientId } from "../config";

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  text?: string;
  loading?: boolean;
  loadingText?: string;
}

declare global {
  interface Window {
    google?: any;
    __googleAuthCallback?: (response: any) => void;
  }
}

export default function GoogleAuthButton({
  onSuccess,
  onError,
  disabled,
  text = "Continue with Google",
  loading = false,
  loadingText = "Authenticating...",
}: GoogleAuthButtonProps) {
  const clientId = getGoogleClientId();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 100, y: 20 });
  const callbackRef = useRef<{ onSuccess: typeof onSuccess; onError: typeof onError }>({ onSuccess, onError });
  const gsiContainerRef = useRef<HTMLDivElement>(null);

  // Keep callback ref current
  callbackRef.current = { onSuccess, onError };

  // Load the GSI script (needed for initialize + credential callback)
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
    script.onerror = () => {
      // Script failed to load (ad blocker?) — still allow fallback
      setScriptLoaded(false);
    };
    document.body.appendChild(script);
  }, [clientId]);

  // Initialize GSI and render Google native card button overlay
  useEffect(() => {
    if (!scriptLoaded || !clientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          setIsAuthorizing(false);
          if (response.credential) {
            callbackRef.current.onSuccess(response.credential);
          } else {
            callbackRef.current.onError("Google Sign-In credential not received");
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });

      // Display Google One Tap card prompt on screen
      try {
        window.google.accounts.id.prompt();
      } catch {
        // Prompt ignore
      }

      // Render Google's native button as an invisible overlay on top of our custom 3D glass button
      if (gsiContainerRef.current) {
        gsiContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(gsiContainerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: gsiContainerRef.current.offsetWidth || 380,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      }
    } catch (err: any) {
      console.error("Google Auth initialization error:", err);
    }
  }, [scriptLoaded, clientId]);

  // Fallback click handler if GSI overlay is blocked or not available
  const handleFallbackClick = useCallback(() => {
    if (!clientId || disabled || loading || isAuthorizing) return;

    // Try GSI prompt first for card popup
    if (window.google?.accounts?.id?.prompt) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch {
        // Continue to OAuth popup fallback
      }
    }

    setIsAuthorizing(true);

    // Direct OAuth popup fallback
    const nonce = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const redirectUri = window.location.origin;
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
      setIsAuthorizing(false);
      onError("Popup blocked by browser. Please allow popups for this site and try again.");
      return;
    }

    // Poll the popup for the redirect back with the id_token in the URL hash
    const pollTimer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer);
          setIsAuthorizing(false);
          return;
        }
        if (popup.location?.origin === window.location.origin) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(pollTimer);

          if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const idToken = params.get("id_token");
            if (idToken) {
              callbackRef.current.onSuccess(idToken);
            } else {
              setIsAuthorizing(false);
              const error = params.get("error");
              callbackRef.current.onError(error || "Google Sign-In failed. No token received.");
            }
          } else {
            setIsAuthorizing(false);
          }
        }
      } catch {
        // Cross-origin polling
      }
    }, 400);

    setTimeout(() => {
      clearInterval(pollTimer);
      setIsAuthorizing(false);
      try { if (!popup.closed) popup.close(); } catch { /* ignore */ }
    }, 300000);
  }, [clientId, disabled, loading, isAuthorizing, onError]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const isBusy = loading || isAuthorizing;
  const displayText = loading 
    ? (loadingText || "Authenticating with Google...") 
    : isAuthorizing 
      ? "Connecting to Google..." 
      : text;

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => onError("Google Client ID is missing. Set VITE_GOOGLE_CLIENT_ID in environment variables.")}
        disabled={disabled || isBusy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-input bg-elevated text-sm font-medium text-textPrimary transition-colors hover:bg-border disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
        {displayText}
      </button>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-input select-none ${isBusy ? "cursor-wait opacity-90" : "cursor-pointer"}`}
      onClick={handleFallbackClick}
      onMouseEnter={(e) => {
        if (isBusy) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setCursorPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setIsHovered(true);
      }}
      onMouseMove={(e) => {
        if (!isBusy) handleMouseMove(e);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => {
        if (!isBusy) setIsPressed(true);
      }}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Invisible GSI Card Popup Overlay (activates Google's native in-page Card Picker when clicked) */}
      <div
        ref={gsiContainerRef}
        className="absolute inset-0 z-20 flex items-center justify-center opacity-0 cursor-pointer overflow-hidden [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!cursor-pointer"
        aria-hidden="true"
      />

      {/* Visual Custom 3D Glass Button */}
      <div
        className={`relative z-10 flex h-11 w-full items-center justify-center gap-3 rounded-input border border-black/20 bg-gradient-to-b from-[#e5ff33] via-primary to-[#b8da00] px-4 text-sm font-black text-background transition-all duration-200 ease-out ${
          isPressed
            ? "scale-[0.96] shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
            : isHovered && !isBusy
              ? "scale-[1.02] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_0_30px_rgba(217,255,0,0.55)]"
              : isBusy
                ? "scale-100 shadow-[0_0_20px_rgba(217,255,0,0.4)]"
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
        {!isBusy && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-150"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle 90px at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.15) 40%, transparent 80%)`,
            }}
          />
        )}

        {/* Google Icon Badge or Spinner */}
        <div
          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-1 ring-black/15 transition-transform duration-200 ${
            isPressed ? "scale-95" : isHovered && !isBusy ? "scale-110 rotate-6" : "scale-100"
          }`}
        >
          {isBusy ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
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
          )}
        </div>

        {/* Text Label */}
        <span className="relative z-10 font-black tracking-wide text-background drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
          {displayText}
        </span>
      </div>
    </div>
  );
}
