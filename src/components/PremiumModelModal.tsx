import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

type PremiumModelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  provider: string;
};

export default function PremiumModelModal({
  isOpen,
  onClose,
  modelName,
  provider,
}: PremiumModelModalProps) {
  const navigate = useNavigate();

  if (typeof document === "undefined") return null;

  const formattedProvider = provider ? (provider.charAt(0).toUpperCase() + provider.slice(1)) : "Provider";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-border/60 bg-surface/95 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-left"
          >
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-32 w-64 rounded-full bg-primary/10 blur-3xl" />

            {/* Top Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-elevated/60 text-textMuted transition-all hover:bg-elevated hover:text-textPrimary hover:scale-105 active:scale-95"
              aria-label="Close modal"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-textPrimary truncate">{modelName}</h3>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary border border-primary/25">
                    LOCKED / PRO
                  </span>
                </div>
                <p className="text-xs text-textMuted">{formattedProvider} API Key Required</p>
              </div>
            </div>

            <p className="text-xs text-textSecondary leading-relaxed mb-5">
              This model requires an active API key connection to operate. Configure your key in Settings to unlock and use this model.
            </p>

            {/* Choice Options */}
            <div className="space-y-3">
              {/* Option 1: BYOK (Recommended & Active) */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-all">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-textPrimary">Connect Your API Key (BYOK)</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                    Zero Fee
                  </span>
                </div>
                <p className="text-[11px] text-textMuted leading-relaxed mb-3">
                  Add your personal {formattedProvider} or OpenRouter key in Settings to chat with this model with zero platform markup.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/settings?tab=providers");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-background shadow-[0_0_15px_rgba(217,255,0,0.15)] transition-all hover:bg-primaryHover hover:shadow-[0_0_20px_rgba(217,255,0,0.25)] active:scale-[0.99]"
                >
                  <span>Configure {formattedProvider} Key in Settings</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              {/* Option 2: Pro Subscription (Coming Soon) */}
              <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 opacity-75">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-textSecondary">Neural Architect Pro Plan</span>
                  <span className="rounded-full bg-elevated border border-border/50 px-2 py-0.5 text-[9px] font-bold text-textMuted uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-textMuted leading-relaxed mb-3">
                  Direct access to all frontier reasoning models without configuring your own API keys.
                </p>
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/30 bg-elevated/40 px-4 py-2 text-xs font-semibold text-textMuted cursor-not-allowed"
                >
                  <span>Pro Upgrade (Coming Soon)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
