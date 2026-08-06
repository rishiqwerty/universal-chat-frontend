import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-surface border border-border/40 rounded-card shadow-2xl pointer-events-auto flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/20">
                <div>
                  <h2 className="text-lg font-headline font-bold text-textPrimary">Help & Support</h2>
                  <p className="text-xs text-textMuted mt-0.5">Quick reference and resources</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-input text-textMuted hover:bg-elevated hover:text-textPrimary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-6">
                {/* Keyboard Shortcuts */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-textMuted mb-3">Keyboard Shortcuts</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-textSecondary">Send message</span>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-elevated text-xs font-medium text-textPrimary border border-border/30">Enter</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-textSecondary">New line</span>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-elevated text-xs font-medium text-textPrimary border border-border/30">Shift</kbd>
                        <span className="text-textMuted">+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-elevated text-xs font-medium text-textPrimary border border-border/30">Enter</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-textSecondary">Focus chat input</span>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-elevated text-xs font-medium text-textPrimary border border-border/30">/</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resources */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-textMuted mb-3">Resources</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/docs"
                      onClick={onClose}
                      className="flex flex-col gap-1.5 p-3 rounded-input bg-elevated/30 border border-border/20 hover:bg-elevated hover:border-border/40 transition-colors"
                    >
                      <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="text-sm font-semibold text-textPrimary">Documentation</span>
                      <span className="text-[10px] text-textMuted">Read setup guides & API docs</span>
                    </Link>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col gap-1.5 p-3 rounded-input bg-elevated/30 border border-border/20 hover:bg-elevated hover:border-border/40 transition-colors"
                    >
                      <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      <span className="text-sm font-semibold text-textPrimary">Report Issue</span>
                      <span className="text-[10px] text-textMuted">Submit feedback on GitHub</span>
                    </a>
                  </div>
                </div>

                {/* Info */}
                <div className="pt-4 border-t border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded flex items-center justify-center bg-primary/10">
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path fill="#D9FF00" d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-textPrimary">Neural Architect</span>
                  </div>
                  <span className="text-[10px] font-mono text-textMuted bg-elevated px-2 py-0.5 rounded">v1.0.4-BETA</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
