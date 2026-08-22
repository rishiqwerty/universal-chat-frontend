import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

type PremiumModelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  provider: string;
  onSelectAnyway?: () => void;
};

export default function PremiumModelModal({
  isOpen,
  onClose,
  modelName,
  provider,
  onSelectAnyway,
}: PremiumModelModalProps) {
  const navigate = useNavigate();

  if (typeof document === "undefined") return null;

  const formattedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-textPrimary truncate">{modelName}</h3>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary border border-primary/25">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-textMuted">{formattedProvider} Frontier Intelligence</p>
              </div>
            </div>

            <p className="text-xs text-textSecondary leading-relaxed mb-5">
              This model requires an active provider connection. You can connect your own API key to start using it immediately or wait for Pro plans.
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
                    Available Now
                  </span>
                </div>
                <p className="text-[11px] text-textMuted leading-relaxed mb-3">
                  Add your personal {formattedProvider} or OpenRouter key in Settings to chat with this model with zero platform fee.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/settings?tab=providers");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-background shadow-[0_0_15px_rgba(217,255,0,0.15)] transition-all hover:bg-primaryHover hover:shadow-[0_0_20px_rgba(217,255,0,0.25)] active:scale-[0.99]"
                >
                  <span>Configure {formattedProvider} API Key</span>
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

            {/* Select Anyway Link */}
            {onSelectAnyway && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onSelectAnyway();
                    onClose();
                  }}
                  className="text-[11px] text-textMuted hover:text-textPrimary underline transition-colors"
                >
                  I already have an active key &mdash; select model
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
