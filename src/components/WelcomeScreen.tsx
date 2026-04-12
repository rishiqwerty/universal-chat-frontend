import { motion } from "framer-motion";
import { useMemo } from "react";

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
          fill="#D9FF00"
          d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z"
        />
      </svg>
    </div>
  );
}

export default function WelcomeScreen() {
  const greeting = useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

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
    </motion.div>
  );
}
