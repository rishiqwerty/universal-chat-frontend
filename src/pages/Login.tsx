import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAccount, googleLoginAccount, requestOtpApi, verifyOtpApi, clearChatCache } from "../api/api";
import PageTransition from "../components/PageTransition";
import GoogleAuthButton from "../components/GoogleAuthButton";
import OtpInput from "../components/OtpInput";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { useAuth } from "../context/AuthContext";
import { isEmailPasswordSignInEnabled, isEmailOtpSignInEnabled, isEmailSignUpEnabled } from "../config";


function LogoMark() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-input bg-elevated shadow-[0_0_16px_rgba(217,255,0,0.15)]">
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
  const showPasswordLogin = isEmailPasswordSignInEnabled();
  const showOtpLogin = isEmailOtpSignInEnabled();
  const showEmailSignIn = showPasswordLogin || showOtpLogin;
  const showEmailSignUp = isEmailSignUpEnabled();

  const [authMode, setAuthMode] = useState<"password" | "otp">(() => {
    if (!showPasswordLogin && showOtpLogin) return "otp";
    return "password";
  });
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("");

  const startProgressTimer = (initialMsg: string) => {
    setAuthStatus(initialMsg);
    const t1 = setTimeout(() => {
      setAuthStatus("Connecting to cloud server & database...");
    }, 2200);
    const t2 = setTimeout(() => {
      setAuthStatus("Please wait a moment...");
    }, 6000);
    const t3 = setTimeout(() => {
      setAuthStatus("Almost ready, initializing secure workspace session...");
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  async function handleGoogleSuccess(credential: string) {
    setLoading(true);
    setError("");
    const stopTimer = startProgressTimer("Verifying Google account with backend...");
    try {
      const token = await googleLoginAccount(credential);
      stopTimer();
      setAuthStatus("Backend online! Redirecting to workspace...");
      await new Promise((r) => setTimeout(r, 350));
      localStorage.clear();
      clearChatCache();
      login(token);
      navigate("/");
    } catch (err: any) {
      stopTimer();
      console.error("Google sign-in error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Authentication server is currently unavailable. Please retry in a moment.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  function handleGoogleError() {
    setError("Google Sign-In popup was closed or unavailable. Please try again.");
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const stopTimer = startProgressTimer("Verifying credentials with server...");

    try {
      const token = await loginAccount({ email, password });
      stopTimer();
      setAuthStatus("Credentials verified! Opening workspace...");
      await new Promise((r) => setTimeout(r, 350));
      localStorage.clear();
      clearChatCache();
      login(token);
      navigate("/");
    } catch (err: any) {
      stopTimer();
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid email or password. Please verify credentials.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const stopTimer = startProgressTimer("Connecting to server to dispatch code...");

    try {
      await requestOtpApi(email);
      stopTimer();
      setSuccessMsg(`A 6-digit access code was dispatched to ${email}.`);
      setOtpStep("verify");
    } catch (err: any) {
      stopTimer();
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to generate security code. Please retry.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  async function handleVerifyOtp(code: string) {
    if (!email || !code || code.length < 6) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const stopTimer = startProgressTimer("Verifying passcode with backend...");

    try {
      const token = await verifyOtpApi(email, code);
      stopTimer();
      setAuthStatus("Passcode confirmed! Redirecting...");
      await new Promise((r) => setTimeout(r, 350));
      localStorage.clear();
      clearChatCache();
      login(token);
      navigate("/");
    } catch (err: any) {
      stopTimer();
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid or expired passcode. Please try again.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block transition-transform hover:scale-[1.02]">
              <LogoMark />
              <h1 className="mt-4 font-headline text-2xl font-black uppercase tracking-widest text-textPrimary">
                Neural Architect
              </h1>
            </Link>
            <p className="mt-1 text-xs text-textSecondary">
              V1.0.4-Beta • Deepmind Ingress
            </p>
          </div>

          <div className="relative rounded-card bg-surface p-8 shadow-2xl ring-1 ring-border/40 backdrop-blur-xl overflow-hidden">
            {/* Loading / Auth Processing Overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-surface/95 backdrop-blur-md p-6 text-center">
                <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary shadow-[0_0_20px_rgba(217,255,0,0.35)]" />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg className="h-5 w-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-headline text-sm sm:text-base font-bold text-textPrimary tracking-tight">
                  {authStatus || "Processing Sign-In..."}
                </h3>
                <p className="mt-1 text-xs text-textMuted max-w-xs">
                  Establishing secure neural session and loading your workspace...
                </p>
              </div>
            )}

            {!showEmailSignIn && (
              <div className="mb-6 text-center">
                <h2 className="text-xl font-headline font-bold text-textPrimary">
                  Sign In to Neural Architect
                </h2>
                <p className="mt-1.5 text-xs text-textSecondary leading-relaxed">
                  Fast, passwordless sign-in with your Google account. Automatically authenticates existing users or initializes a new account.
                </p>
              </div>
            )}

            <div className={`${showEmailSignIn ? "mb-6" : "mb-4"} rounded-xl border border-primary/20 bg-primary/[0.03] p-4 text-center`}>
              {showEmailSignIn && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Recommended • 1-Click Ingress
                </div>
              )}

              <GoogleAuthButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={loading}
                loading={loading}
                loadingText={authStatus || "Authenticating with Google..."}
                text="Continue with Google"
              />
            </div>

            {!showEmailSignIn && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-textMuted leading-relaxed">
                <svg className="h-3 w-3 text-textMuted/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Single Sign-On (SSO) • Passwordless authentication</span>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="mt-4 rounded-input bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/40">
                {successMsg}
              </p>
            )}


            {showEmailSignIn && (
              <>
                <div className="relative my-6 flex items-center justify-center">
                  <div className="w-full border-t border-border/30" />
                  <span className="absolute bg-surface px-3 text-[10px] font-semibold uppercase tracking-widest text-textMuted">
                    or sign in with email
                  </span>
                </div>

                {/* Mode Switcher Tabs (shown only when BOTH password and OTP are active) */}
                {showPasswordLogin && showOtpLogin && (
                  <div className="flex border-b border-border/30 mb-6 text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => { setAuthMode("password"); setError(""); setSuccessMsg(""); }}
                      className={`flex-1 pb-3 text-center transition-colors border-b-2 ${authMode === "password"
                        ? "border-primary text-primary"
                        : "border-transparent text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("otp"); setError(""); setSuccessMsg(""); setOtpStep("request"); }}
                      className={`flex-1 pb-3 text-center transition-colors border-b-2 ${authMode === "otp"
                        ? "border-primary text-primary"
                        : "border-transparent text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      Email OTP
                    </button>
                  </div>
                )}

                {/* PASSWORD LOGIN FORM */}
                {authMode === "password" && showPasswordLogin && (
                  <form onSubmit={handlePasswordLogin}>
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
                          onClick={() => { setAuthMode("otp"); setOtpStep("request"); }}
                          className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primaryHover"
                        >
                          Login via OTP
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
                  </form>
                )}

                {/* EMAIL OTP LOGIN FORM */}
                {authMode === "otp" && showOtpLogin && (
                  <div>
                    {otpStep === "request" ? (
                      <form onSubmit={handleRequestOtp}>
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
                        <button
                          type="submit"
                          disabled={loading}
                          className="mt-8 w-full rounded-input bg-primary py-3 text-sm font-bold text-background shadow-[0_0_24px_rgba(217,255,0,0.35)] transition-colors hover:bg-primaryHover disabled:opacity-50"
                        >
                          {loading ? "Sending Access Code…" : "Send Verification Code"}
                        </button>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-4 flex items-center justify-between text-xs text-textSecondary">
                          <span>Code sent to <strong>{email}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtpStep("request")}
                            className="text-primary hover:underline text-[11px]"
                          >
                            Change Email
                          </button>
                        </div>
                        <OtpInput
                          onComplete={handleVerifyOtp}
                          onResend={handleRequestOtp}
                          loading={loading}
                          error=""
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>


          {showEmailSignUp && (
            <p className="mt-8 text-center text-sm text-textSecondary">
              New operative?{" "}
              <Link to="/signup" className="font-medium text-primary hover:text-primaryHover">
                Initialize Account
              </Link>
            </p>
          )}

          <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            {/* <Link to="/refund-policy" className="hover:text-primary transition-colors">
              Refund Policy
            </Link> */}
            {/* <Link to="/contact-us" className="hover:text-primary transition-colors">
              Contact Us
            </Link> */}
          </footer>
        </div>
      </div>
    </PageTransition>
  );
}
