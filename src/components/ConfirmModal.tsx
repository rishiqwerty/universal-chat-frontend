import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
}: ConfirmModalProps) {
  const isLogout = title.toLowerCase().includes("log out") || title.toLowerCase().includes("logout") || title.toLowerCase().includes("sign out");
  const isDelete = title.toLowerCase().includes("delete") || title.toLowerCase().includes("remove") || title.toLowerCase().includes("cancel");

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          {/* Backdrop with rich blur */}
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
            className="relative my-auto w-full max-w-[340px] sm:max-w-sm max-h-[88vh] overflow-y-auto custom-scrollbar rounded-3xl border border-border/60 bg-surface/95 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-center"
          >
            {/* Ambient Background Glow */}
            <div
              className={`pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-56 rounded-full blur-3xl ${
                isLogout
                  ? "bg-primary/15"
                  : isDelete
                  ? "bg-rose-500/15"
                  : "bg-primary/15"
              }`}
            />

            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-elevated/60 text-textMuted transition-all hover:bg-elevated hover:text-textPrimary hover:scale-105 active:scale-95"
              aria-label="Close dialog"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Hero Icon with Pulsing Halo & Sparks */}
            <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.25, 0.55, 0.25],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-2xl blur-xl pointer-events-none ${
                  isLogout
                    ? "bg-primary/25"
                    : isDelete
                    ? "bg-rose-500/25"
                    : "bg-primary/25"
                }`}
              />

              {/* Spark Accent */}
              <span className={`absolute -top-1 right-0 text-[10px] select-none pointer-events-none ${
                isLogout ? "text-primary" : isDelete ? "text-rose-400" : "text-primary"
              }`}>
                ✦
              </span>

              {/* Icon Container */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg ${
                  isLogout
                    ? "border-primary/30 bg-primary/10 text-primary shadow-[0_0_20px_rgba(217,255,0,0.12)]"
                    : isDelete
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    : "border-primary/30 bg-primary/10 text-primary shadow-[0_0_20px_rgba(217,255,0,0.12)]"
                }`}
              >
                {isLogout ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                ) : isDelete ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Title */}
            <h3
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="text-lg sm:text-xl font-headline font-bold tracking-tight text-textPrimary"
            >
              {title}
            </h3>

            {/* Message Body */}
            <p className="mt-2 text-xs sm:text-sm text-textSecondary leading-relaxed max-w-xs mx-auto">
              {message}
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border/50 bg-elevated/40 py-2.5 text-xs sm:text-sm font-semibold text-textSecondary transition-all hover:bg-elevated hover:text-textPrimary hover:border-border active:scale-95"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 ${
                  isLogout
                    ? "bg-primary text-background shadow-[0_0_16px_rgba(217,255,0,0.25)] hover:bg-primaryHover"
                    : isDelete || confirmVariant === "danger"
                    ? "bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.3)] hover:bg-rose-600"
                    : "bg-primary text-background shadow-[0_0_16px_rgba(217,255,0,0.25)] hover:bg-primaryHover"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
