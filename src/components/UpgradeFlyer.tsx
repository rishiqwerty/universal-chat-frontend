import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

type UpgradeFlyerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UpgradeFlyer({ isOpen, onClose }: UpgradeFlyerProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9, x: -10 }}
          animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-6 left-6 z-[60] w-[220px] overflow-hidden rounded-xl border border-primary/20 bg-elevated/95 p-3 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary italic">Pro Nudge</span>
              </div>
              <button
                onClick={onClose}
                className="text-textMuted transition-colors hover:text-textPrimary"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[10px] leading-snug text-textSecondary">
              Unleash <span className="text-textPrimary font-bold">Claude 4.7, Nano Banana and more advanced models</span> with higher limits.
            </p>

            <div className="flex flex-col gap-1.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  navigate("/settings");
                  onClose();
                }}
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-1.5 text-[9px] font-black uppercase tracking-widest text-background transition-all hover:bg-primaryHover"
              >
                Upgrade to Pro
                <div className="h-3 w-3 transition-transform group-hover:translate-x-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </motion.button>

              <button
                onClick={() => {
                  navigate("/settings");
                  onClose();
                }}
                className="text-center text-[9px] font-bold uppercase tracking-tight text-textSecondary/60 hover:text-primary transition-colors"
              >
                Use own API core
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
