import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { getUserProfile, updateUserProfile, uploadUserAvatar, googleLoginAccount, clearChatCache, type UserProfile, type UserProfileUpdate } from "../api/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loadingUser: boolean;
  isAuthenticating: boolean;
  authStatusMessage: string;
  setAuthenticating: (authenticating: boolean, message?: string) => void;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfile: (payload: UserProfileUpdate) => Promise<UserProfile>;
  uploadAvatar: (file: File) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function wipeUserState() {
  const preserveKeys = ["accent-color", "sidebar_collapsed", "hasSeenMcpNotification"];
  const preserved: Record<string, string | null> = {};
  preserveKeys.forEach((key) => {
    try {
      preserved[key] = localStorage.getItem(key);
    } catch {
      /* ignore */
    }
  });

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  preserveKeys.forEach((key) => {
    if (preserved[key] !== null) {
      try {
        localStorage.setItem(key, preserved[key]!);
      } catch {
        /* ignore */
      }
    }
  });

  clearChatCache();
  try {
    window.dispatchEvent(new Event("app:user-logged-out"));
    window.dispatchEvent(new Event("chat:reset"));
    window.dispatchEvent(new Event("balance-update"));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loadingUser, setLoadingUser] = useState(false);

  // Synchronously detect OAuth hash on initial load to eliminate temp-mode flicker
  const [isAuthenticating, setIsAuthenticating] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash;
    return !!(hash && (hash.includes("id_token=") || hash.includes("access_token=")));
  });
  const [authStatusMessage, setAuthStatusMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const hash = window.location.hash;
    return hash && (hash.includes("id_token=") || hash.includes("access_token="))
      ? "Authenticating with Google..."
      : "";
  });

  const setAuthenticating = useCallback((authenticating: boolean, message?: string) => {
    setIsAuthenticating(authenticating);
    if (message !== undefined) {
      setAuthStatusMessage(message);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!localStorage.getItem("access_token")) {
      setUser(null);
      localStorage.removeItem("user_profile");
      return null;
    }
    setLoadingUser(true);
    try {
      const profile = await getUserProfile();
      setUser(profile);
      localStorage.setItem("user_profile", JSON.stringify(profile));
      return profile;
    } catch {
      return null;
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: UserProfileUpdate): Promise<UserProfile> => {
    const updated = await updateUserProfile(payload);
    setUser(updated);
    localStorage.setItem("user_profile", JSON.stringify(updated));
    return updated;
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<UserProfile> => {
    const updated = await uploadUserAvatar(file);
    setUser(updated);
    localStorage.setItem("user_profile", JSON.stringify(updated));
    return updated;
  }, []);

  const login = useCallback((token: string) => {
    wipeUserState();
    localStorage.setItem("access_token", token);
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
    getUserProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem("user_profile", JSON.stringify(profile));
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const logout = useCallback(() => {
    wipeUserState();
    setIsAuthenticated(false);
    setUser(null);
    setIsAuthenticating(false);
    setAuthStatusMessage("");
  }, []);

  // Fetch profile on initial load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setUser(null);
    }
  }, [isAuthenticated, refreshProfile]);

  // Global OAuth hash listener (for mobile redirect & direct return to origin)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && (hash.includes("id_token=") || hash.includes("access_token="))) {
      setIsAuthenticating(true);
      setAuthStatusMessage("Authenticating with Google...");

      const t1 = setTimeout(() => {
        setAuthStatusMessage("Establishing secure neural session...");
      }, 2200);
      const t2 = setTimeout(() => {
        setAuthStatusMessage("Setting up your workspace...");
      }, 5500);

      try {
        const cleanHash = hash.startsWith("#") ? hash.substring(1) : hash;
        const params = new URLSearchParams(cleanHash);
        const idToken = params.get("id_token");
        if (idToken) {
          window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
          googleLoginAccount(idToken)
            .then((token) => {
              setAuthStatusMessage("Success! Loading workspace...");
              login(token);
              setTimeout(() => {
                setIsAuthenticating(false);
                setAuthStatusMessage("");
                if (window.location.pathname === "/login" || window.location.pathname === "/signup") {
                  window.location.href = "/";
                }
              }, 400);
            })
            .catch((err) => {
              console.error("Global Google login error:", err);
              setIsAuthenticating(false);
              setAuthStatusMessage("");
            });
        } else {
          setIsAuthenticating(false);
          setAuthStatusMessage("");
        }
      } catch (err) {
        console.error("Failed to parse OAuth redirect hash:", err);
        setIsAuthenticating(false);
        setAuthStatusMessage("");
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [login]);

  // Listen for imperative logout events fired from outside React (e.g. axios interceptor)
  useEffect(() => {
    const handler = () => {
      wipeUserState();
      setIsAuthenticated(false);
      setUser(null);
      setIsAuthenticating(false);
      setAuthStatusMessage("");
    };
    window.addEventListener("app:force-logout", handler);
    return () => window.removeEventListener("app:force-logout", handler);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      loadingUser,
      isAuthenticating,
      authStatusMessage,
      setAuthenticating,
      login,
      logout,
      refreshProfile,
      updateProfile,
      uploadAvatar,
    }),
    [
      isAuthenticated,
      user,
      loadingUser,
      isAuthenticating,
      authStatusMessage,
      setAuthenticating,
      login,
      logout,
      refreshProfile,
      updateProfile,
      uploadAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Imperative logout callable from outside React (e.g. axios interceptors).
 * Clears storage and dispatches a custom event that AuthProvider listens to.
 */
export function forceLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("isAuthenticated");
  window.dispatchEvent(new Event("app:force-logout"));
}
