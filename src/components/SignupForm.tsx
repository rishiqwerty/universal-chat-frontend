import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupAccount, googleLoginAccount, requestOtpApi, verifyOtpApi, clearChatCache } from "../api/api";
import GoogleAuthButton from "./GoogleAuthButton";
import OtpInput from "./OtpInput";
import { useAuth } from "../context/AuthContext";
import { isEmailPasswordSignUpEnabled, isEmailOtpSignUpEnabled, isEmailSignInEnabled } from "../config";


function LogoMark() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-input bg-elevated shadow-[0_0_16px_rgba(217,255,0,0.15)]">
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
  const { login } = useAuth();
  const showPasswordSignup = isEmailPasswordSignUpEnabled();
  const showOtpSignup = isEmailOtpSignUpEnabled();
  const showEmailSignUp = showPasswordSignup || showOtpSignup;
  const showEmailSignIn = isEmailSignInEnabled();

  const [method, setMethod] = useState<"standard" | "otp">(() => {
    if (!showPasswordSignup && showOtpSignup) return "otp";
    return "standard";
  });
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("");

  async function handleGoogleSuccess(credential: string) {
    setLoading(true);
    setAuthStatus("Verifying Google account and initializing workspace...");
    setError("");
    try {
      const token = await googleLoginAccount(credential);
      localStorage.clear();
      clearChatCache();
      login(token);
      if (onSuccess) onSuccess();
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Google authentication failed.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  function handleGoogleError(errMsg: string) {
    setError(errMsg);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setAuthStatus("Creating your account...");
    try {
      await signupAccount({ email, password });
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
      setAuthStatus("");
    }
  }

  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setAuthStatus("Sending verification code...");
    setError("");
    setSuccessMsg("");
    try {
      const res = await requestOtpApi(email, "register");
      setSuccessMsg(res.message || `Verification code sent to ${email}`);
      setOtpStep("verify");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Failed to send verification code.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  async function handleVerifyOtp(code: string) {
    setLoading(true);
    setAuthStatus("Verifying code & setting up workspace...");
    setError("");
    setSuccessMsg("");
    try {
      const token = await verifyOtpApi(email, code);
      localStorage.clear();
      clearChatCache();
      login(token);
      if (onSuccess) onSuccess();
      navigate("/chat");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
      setAuthStatus("");
    }
  }

  return (
    <div className={`w-full ${isModal ? "" : "max-w-[420px]"}`}>
      {!isModal && (
        <div className="mb-8 text-center">
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

      <div className={`relative overflow-hidden ${isModal ? "" : "rounded-card bg-surface p-8 shadow-2xl ring-1 ring-border/40 backdrop-blur-xl"}`}>
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
              {authStatus || "Processing Authentication..."}
            </h3>
            <p className="mt-1 text-xs text-textMuted max-w-xs">
              Initializing secure session and preparing your workspace...
            </p>
          </div>
        )}
        
        {!showEmailSignUp && (
          <div className="mb-6 text-center">
            <h2 className="text-xl font-headline font-bold text-textPrimary">
              Create Your Account
            </h2>
            <p className="mt-1.5 text-xs text-textSecondary leading-relaxed">
              Initialize your workspace instantly using your Google account.
            </p>
          </div>
        )}

        {/* RECOMMENDED GOOGLE AUTH AT TOP */}
        <div className={`${showEmailSignUp ? "mb-6" : "mb-4"} rounded-xl border border-primary/20 bg-primary/[0.03] p-4 text-center`}>
          {showEmailSignUp && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Recommended • 1-Click Signup
            </div>
          )}
          
          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={loading}
            loading={loading}
            loadingText={authStatus || "Authenticating with Google..."}
            text="Sign up with Google"
          />
        </div>

        {!showEmailSignUp && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-textMuted leading-relaxed">
            <svg className="h-3 w-3 text-textMuted/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Instant Workspace Setup • Google Authentication</span>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-input bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/50">
            {error}
          </p>
        ) : null}

        {successMsg ? (
          <p className="mt-4 rounded-input bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/40">
            {successMsg}
          </p>
        ) : null}


        {showEmailSignUp && (
          <>
            {/* DIVIDER */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-border/30" />
              <span className="absolute bg-surface px-3 text-[10px] font-semibold uppercase tracking-widest text-textMuted">
                or initialize manually
              </span>
            </div>

            {/* Method selector (shown only when BOTH password and OTP are active) */}
            {showPasswordSignup && showOtpSignup && (
              <div className="flex border-b border-border/30 mb-6 text-xs font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => { setMethod("standard"); setError(""); setSuccessMsg(""); }}
                  className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                    method === "standard"
                      ? "border-primary text-primary"
                      : "border-transparent text-textMuted hover:text-textSecondary"
                  }`}
                >
                  Password Signup
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("otp"); setError(""); setSuccessMsg(""); setOtpStep("request"); }}
                  className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                    method === "otp"
                      ? "border-primary text-primary"
                      : "border-transparent text-textMuted hover:text-textSecondary"
                  }`}
                >
                  OTP Signup
                </button>
              </div>
            )}

            {method === "standard" && showPasswordSignup && (
              <form onSubmit={handleSignup}>
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-textMuted transition-all hover:scale-[1.1] hover:text-textSecondary"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-textMuted transition-all hover:scale-[1.1] hover:text-textSecondary"
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
                  className="mt-8 w-full rounded-input bg-primary py-3 text-sm font-bold text-background shadow-[0_0_24px_rgba(217,255,0,0.35)] transition-all hover:scale-[1.02] hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}
            {method === "otp" && showOtpSignup && (
              <div>
                {otpStep === "request" ? (
                  <form onSubmit={handleRequestOtp}>
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
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-8 w-full rounded-input bg-primary py-3 text-sm font-bold text-background shadow-[0_0_24px_rgba(217,255,0,0.35)] transition-all hover:scale-[1.02] hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Sending Verification Code…" : "Send Verification Code"}
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


      {showEmailSignIn && (
        <p className="mt-8 text-center text-sm text-textSecondary">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:text-primaryHover">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
