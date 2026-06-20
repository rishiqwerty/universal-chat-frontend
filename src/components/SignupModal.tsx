import { motion, AnimatePresence } from "framer-motion";
import SignupForm from "./SignupForm";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export default function SignupModal({ 
  isOpen, 
  onClose, 
  title = "Add New Operative", 
  subtitle = "Initialize Account" 
}: SignupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md"
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-card border border-border/60 bg-elevated shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/20 px-6 py-4 bg-background/50">
                <div>
                  <h3 className="text-lg font-headline font-bold text-textPrimary">{title}</h3>
                  <p className="text-xs text-textSecondary uppercase tracking-widest font-semibold mt-0.5">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-textMuted transition-all hover:scale-[1.1] hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <SignupForm isModal onSuccess={onClose} />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
