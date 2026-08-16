import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { getUserProfile, updateUserProfile, uploadUserAvatar, type UserProfile, type UserProfileUpdate } from "../api/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loadingUser: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfile: (payload: UserProfileUpdate) => Promise<UserProfile>;
  uploadAvatar: (file: File) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    localStorage.setItem("access_token", token);
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
    // Fetch profile immediately on login
    getUserProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem("user_profile", JSON.stringify(profile));
      })
      .catch(() => {});
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user_profile");
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // Fetch profile on initial load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  // Listen for imperative logout events fired from outside React (e.g. axios interceptor)
  useEffect(() => {
    const handler = () => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("user_profile");
    };
    window.addEventListener("app:force-logout", handler);
    return () => window.removeEventListener("app:force-logout", handler);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      loadingUser,
      login,
      logout,
      refreshProfile,
      updateProfile,
      uploadAvatar,
    }),
    [isAuthenticated, user, loadingUser, login, logout, refreshProfile, updateProfile, uploadAvatar]
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
