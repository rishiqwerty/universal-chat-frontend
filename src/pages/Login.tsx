import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAccount, googleLoginAccount, clearChatCache } from "../api/api";
import PageTransition from "../components/PageTransition";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { useAuth } from "../context/AuthContext";

function LogoMark() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-input bg-elevated">
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path fill="#D9FF00" d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z" />
      </svg>
    </div>
  );
}

export default function Login() {
  useDocumentSEO({
    title: "Login",
    description: "Sign in to access your secure AI chat and image generation workspace.",
  });

  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(credential: string) {
    setLoading(true);
    setError("");
    try {
      const token = await googleLoginAccount(credential);
      localStorage.clear();
      clearChatCache();
      login(token);
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError(errMsg: string) {
    setError(errMsg);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = await loginAccount({ email, password });
      
      // Reset all states and local storage for a fresh session
      localStorage.clear();
      clearChatCache();
      
      login(token);
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-sidebar to-background opacity-90"
          aria-hidden
        />
        <div className="relative w-full max-w-[420px]">
          <div className="mb-10 text-center">
            <Link to="/" className="group block">
              <LogoMark />
              <h1 className="mt-5 text-2xl font-headline font-bold tracking-tight text-textPrimary group-hover:text-primary transition-colors">
                Neural Architect
              </h1>
            </Link>
            <p className="mt-1 text-xs text-textSecondary">
              V1.0.4-Beta • Deepmind Ingress
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-card bg-surface p-8 shadow-none ring-1 ring-border/40"
          >
            {error && (
              <p className="mb-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
                {error}
              </p>
            )}

            <label className="block">
              <span className="text-xs font-medium text-textSecondary">Credential Ingress (Email)</span>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-xs">
                  @
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nexus.io"
                  className="h-11 w-full rounded-input border border-border/50 bg-elevated py-2 pl-9 pr-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-textSecondary">Secret Protocol (Password)</label>
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primaryHover"
                >
                  Reset Link
                </button>
              </div>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-input border border-border/50 bg-elevated py-2 pl-10 pr-11 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-textMuted transition-colors hover:text-textSecondary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-input bg-primary py-3 text-sm font-bold text-background shadow-[0_0_24px_rgba(217,255,0,0.35)] transition-colors hover:bg-primaryHover disabled:opacity-50"
            >
              {loading ? "Authenticating…" : "Login to Nexus"}
            </button>

            <div className="mt-8 border-t border-border/20 pt-8 text-center text-[10px] font-semibold uppercase tracking-widest text-textMuted">
              Authorized gateway
            </div>
            <div className="mt-4 flex justify-center">
              <GoogleAuthButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={loading}
              />
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-textSecondary">
            New operative?{" "}
            <Link to="/signup" className="font-medium text-primary hover:text-primaryHover">
              Initialize Account
            </Link>
          </p>

          <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
            <button type="button" className="hover:text-textSecondary">
              Privacy Protocol
            </button>
            <button type="button" className="hover:text-textSecondary">
              Terms of Ingress
            </button>
            <Link to="/" className="hover:text-textSecondary">
              System Root
            </Link>
          </footer>
        </div>
      </div>
    </PageTransition>
  );
}
