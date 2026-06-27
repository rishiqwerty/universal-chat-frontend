import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );

  const login = useCallback((token: string) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  }, []);

  // Listen for imperative logout events fired from outside React (e.g. axios interceptor)
  useEffect(() => {
    const handler = () => setIsAuthenticated(false);
    window.addEventListener("app:force-logout", handler);
    return () => window.removeEventListener("app:force-logout", handler);
  }, []);

  const value = useMemo(() => ({ isAuthenticated, login, logout }), [isAuthenticated, login, logout]);

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
