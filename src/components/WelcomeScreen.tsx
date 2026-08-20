import { useState } from "react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const greetings = [
  "Hi! How can I help you today?",
  "What would you like to explore?",
  "Ready to build something amazing.",
  "Let's architect your next idea.",
  "Ask me anything — I'm here to help.",
  "What problem are we solving today?",
  "Need a code review, a plan, or a brainstorm?",
  "Let's dive in. What's on your mind?",
];

function LogoMark() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-card bg-surface ring-1 ring-border/30">
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          fill="currentColor"
          className="text-primary"
          d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z"
        />
      </svg>
    </div>
  );
}

type WelcomeScreenProps = {
  isAuthenticated?: boolean;
  isTempMode?: boolean;
};

export default function WelcomeScreen({ isAuthenticated = false, isTempMode = false }: WelcomeScreenProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("dismissedStudioBanner") === "true";
  });

  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

  const showStudioBanner = isAuthenticated && !isTempMode && !dismissed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center px-6"
    >
      <LogoMark />
      <h1
        className="mt-5 text-2xl font-bold tracking-tight text-textPrimary"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Neural Architect
      </h1>
      <p className="mt-2 text-sm text-textMuted">V1.0.4-BETA</p>
      <p className="mt-6 max-w-md text-center text-base leading-relaxed text-textSecondary">
        {greeting}
      </p>

      {/* Temporary Mode Subtle Notice */}
      {isTempMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-textMuted/75"
        >
          <svg className="h-3.5 w-3.5 shrink-0 text-textMuted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {isAuthenticated ? (
            <span>Temporary chat &mdash; messages are not saved to your account.</span>
          ) : (
            <span>
              Temporary chat is not saved.{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-textSecondary underline hover:text-textPrimary transition-colors"
              >
                Log in
              </button>{" "}
              to save history.
            </span>
          )}
        </motion.div>
      )}

      {/* Studio Marketing Banner */}
      {showStudioBanner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 w-full max-w-md"
        >
          <div
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-elevated/80 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-[0_0_30px_rgba(var(--color-primary),0.1)]"
            onClick={() => navigate("/studio")}
          >
            {/* Glow */}
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/8 blur-[40px] pointer-events-none transition-all group-hover:bg-primary/15" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-textPrimary">Try Image Studio</p>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary">
                    New
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-textSecondary">
                  Generate stunning AI images from text prompts.
                </p>
              </div>
              <div className="text-textMuted transition-transform group-hover:translate-x-1 group-hover:text-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
                localStorage.setItem("dismissedStudioBanner", "true");
              }}
              className="absolute right-2 top-2 rounded-lg p-1 text-textMuted/40 transition-colors hover:text-textMuted"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
