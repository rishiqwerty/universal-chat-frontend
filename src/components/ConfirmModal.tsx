import { motion, AnimatePresence } from "framer-motion";

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
  confirmVariant = "danger"
}: ConfirmModalProps) {
  const isLogout = title.toLowerCase().includes("log out") || title.toLowerCase().includes("logout");
  const isDelete = title.toLowerCase().includes("delete") || title.toLowerCase().includes("remove");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with rich blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-elevated/95 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            {/* Top glass highlight line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Close 'X' button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-textMuted transition-all hover:bg-surface hover:text-textPrimary"
              aria-label="Close dialog"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-start gap-4">
              {/* Contextual Icon Badge */}
              <div 
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  confirmVariant === "danger"
                    ? isLogout
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    : "border-primary/30 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.15)]"
                }`}
              >
                {isLogout ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                ) : isDelete ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
              </div>

              {/* Title & Message */}
              <div className="flex-1 pr-4">
                <h3 
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-lg font-headline font-bold tracking-tight text-textPrimary"
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm text-textSecondary leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/20 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-input border border-border/50 bg-surface/50 px-4 py-2 text-sm font-semibold text-textSecondary transition-all hover:bg-surface hover:text-textPrimary hover:border-border"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`rounded-input px-5 py-2 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  confirmVariant === "danger" 
                    ? isLogout
                      ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                      : "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_14px_rgba(239,68,68,0.25)]" 
                    : "bg-primary text-background hover:bg-primaryHover shadow-[0_0_14px_rgba(var(--color-primary),0.25)]"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
