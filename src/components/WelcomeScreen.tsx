import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const greetings = [
  "What would you like to build today?",
  "How can I assist you with your project?",
  "Ready to explore, write code, or brainstorm?",
  "What problem are we solving today?",
  "Ask anything or test an interactive prompt below.",
];

const samplePrompts = [
  {
    title: "Python Sandbox",
    desc: "Run a Mandelbrot fractal calculation in-terminal",
    prompt: "Write and execute a Python script that calculates and prints an ASCII Mandelbrot fractal visualization directly in the terminal.",
  },
  {
    title: "Technical Reasoning",
    desc: "Analyze post-quantum cryptography & security",
    prompt: "Explain how post-quantum cryptography works, specifically lattice-based cryptography, and compare it with RSA encryption.",
  },
  {
    title: "Visual Synthesis",
    desc: "Generate a neon architectural schematic",
    prompt: "Generate an image of an ultra-detailed futuristic neon architectural schematic blueprint with glowing holographic layers.",
  },
  {
    title: "System Architecture",
    desc: "Design a fault-tolerant distributed event queue",
    prompt: "Architect a fault-tolerant, high-throughput distributed event streaming system in Python with backpressure handling.",
  },
];

function LogoMark() {
  return (
    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-surface border border-border/40 shadow-sm">
      <svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden className="text-primary sm:w-7 sm:h-7">
        <path
          fill="currentColor"
          d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z"
        />
      </svg>
    </div>
  );
}

type WelcomeScreenProps = {
  isAuthenticated?: boolean;
  isTempMode?: boolean;
  onSelectPrompt?: (prompt: string) => void;
};

export default function WelcomeScreen({
  isAuthenticated = false,
  isTempMode = false,
  onSelectPrompt,
}: WelcomeScreenProps) {
  const navigate = useNavigate();

  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

  const isGuestOrUnauth = !isAuthenticated || isTempMode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-center w-full max-w-2xl px-3 sm:px-4 select-none"
    >
      <LogoMark />

      <h1
        className="mt-3.5 text-xl sm:text-2xl font-bold tracking-tight text-textPrimary text-center"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Neural Architect
      </h1>

      <p className="mt-1.5 text-center text-xs sm:text-sm text-textSecondary max-w-md leading-relaxed">
        {greeting}
      </p>

      {/* Clean, Subtle Prompt Suggestions */}
      {isGuestOrUnauth && (
        <div className="mt-5 sm:mt-6 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt?.(sample.prompt)}
                className={`flex flex-col rounded-xl border border-border/40 bg-surface/40 hover:bg-surface hover:border-border px-3.5 py-2.5 text-left transition-colors group ${
                  idx >= 2 ? "hidden sm:flex" : ""
                }`}
              >
                <span className="text-[10px] font-semibold text-textMuted group-hover:text-primary transition-colors">
                  {sample.title}
                </span>
                <span className="text-xs text-textSecondary group-hover:text-textPrimary transition-colors truncate mt-0.5">
                  {sample.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Studio Spotlight Bar */}
      <div className="mt-2.5 sm:mt-3 w-full">
        <button
          type="button"
          onClick={() => navigate("/studio")}
          className="flex items-center justify-between w-full rounded-xl border border-border/40 bg-surface/30 hover:bg-surface/70 hover:border-border px-3.5 py-2.5 text-left transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated text-primary border border-border/40 group-hover:border-primary/40 transition-colors">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-textPrimary">Image Studio</span>
                <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                  Visual AI
                </span>
              </div>
              <p className="text-[11px] text-textMuted truncate">
                Synthesize custom visuals with fine-grained aspect ratio & prompt controls.
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-textSecondary group-hover:text-primary transition-colors flex items-center gap-1 shrink-0 ml-2">
            <span className="hidden sm:inline">Explore Studio</span>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </button>
      </div>

      {/* Temporary Mode Subtle Notice */}
      {isTempMode && (
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-xs text-textMuted">
          <svg className="h-3.5 w-3.5 shrink-0 text-textMuted/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
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
                className="text-textSecondary underline hover:text-textPrimary transition-colors font-medium"
              >
                Log in
              </button>{" "}
              to save history.
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
