import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupAccount, clearChatCache } from "../api/api";

function LogoMark() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-input bg-elevated">
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path fill="#D9FF00" d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z" />
      </svg>
    </div>
  );
}

type SignupFormProps = {
  isModal?: boolean;
  onSuccess?: () => void;
};

export default function SignupForm({ isModal, onSuccess }: SignupFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signupAccount({ email, password });
      // Fresh start for new user
      localStorage.clear();
      clearChatCache();
      
      if (onSuccess) {
        onSuccess();
      }
      navigate("/login");
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || err.response?.data?.detail;
      setError(serverMessage || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`w-full ${isModal ? "" : "max-w-[420px]"}`}>
      {!isModal && (
        <div className="mb-10 text-center">
          <Link to="/" className="group block">
            <LogoMark />
            <h1 className="mt-5 text-2xl font-headline font-bold tracking-tight text-textPrimary group-hover:text-primary transition-colors">
              Neural Architect
            </h1>
          </Link>
          <p className="mt-1 text-xs text-textSecondary">
            V1.0.4-Beta • Secure Protocol
          </p>
        </div>
      )}

      <form
        onSubmit={handleSignup}
        className={`${isModal ? "" : "rounded-card bg-surface p-8 shadow-none ring-1 ring-border/40"}`}
      >
        {error ? (
          <p className="mb-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
            {error}
          </p>
        ) : null}

        <label className="block">
          <span className="text-xs font-medium text-textSecondary">Email</span>
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
              placeholder="you@example.com"
              className="h-11 w-full rounded-input border border-border/50 bg-elevated py-2 pl-9 pr-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </label>

        <div className="mt-5">
          <label htmlFor="signup-password" className="text-xs font-medium text-textSecondary">
            Password
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </span>
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <div className="mt-5">
          <label htmlFor="signup-password-confirm" className="text-xs font-medium text-textSecondary">
            Confirm password
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </span>
            <input
              id="signup-password-confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-input border border-border/50 bg-elevated py-2 pl-10 pr-11 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((s) => !s)}
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
          className="mt-8 w-full rounded-input bg-primary py-3 text-sm font-bold text-background shadow-[0_0_24px_rgba(217,255,0,0.35)] transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="mt-8 border-t border-border/20 pt-8">
            <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-textMuted">
              Third party validation
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-2 rounded-input bg-elevated text-sm font-medium text-textPrimary transition-colors hover:bg-border"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.089 2.91.833.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub
              </button>
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-2 rounded-input bg-elevated text-sm font-medium text-textPrimary transition-colors hover:bg-border"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M12 8c-2.2 0-4 1.6-4 3.6 0 2.3 1.8 3.6 4 3.6s4-1.3 4-3.6C16 9.6 14.2 8 12 8z" />
                  <path d="M4 12c0-4.2 3.4-7.5 8-7.5s8 3.3 8 7.5-3.4 7.5-8 7.5-8-3.3-8-7.5z" />
                </svg>
                Google
              </button>
            </div>
          </div>
      </form>

      <p className="mt-8 text-center text-sm text-textSecondary">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-primary hover:text-primaryHover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
