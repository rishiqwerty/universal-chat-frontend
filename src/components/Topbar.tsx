import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "./ConfirmModal";
import SignupModal from "./SignupModal";

type TopbarProps = {
  activeChatTitle?: string | null;
  onUpdateTitle?: (newTitle: string) => void;
  onDeleteChat?: () => void;
};

export default function Topbar({ activeChatTitle, onUpdateTitle, onDeleteChat }: TopbarProps) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeChatTitle) setEditingTitle(activeChatTitle);
  }, [activeChatTitle]);

  function handleBlur() {
    if (editingTitle.trim() !== "" && editingTitle !== activeChatTitle && onUpdateTitle) {
      onUpdateTitle(editingTitle.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-border/30 bg-background px-6">
      <div className="relative min-w-0 flex-1 max-w-2xl">
        {activeChatTitle != null ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="w-full bg-transparent text-lg font-headline font-semibold text-textPrimary placeholder:text-textMuted focus:outline-none"
            placeholder="Conversation Title"
          />
        ) : (
          <>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search across chat library..."
              className="h-10 w-full rounded-input border border-border/50 bg-surface py-2 pl-10 pr-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {activeChatTitle != null && onDeleteChat && (
          <button
            type="button"
            onClick={onDeleteChat}
            className="flex h-9 w-9 items-center justify-center text-textMuted transition-colors hover:text-red-500"
            aria-label="Delete Chat"
            title="Delete Chat"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
          aria-label="Layout"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
          aria-label="AI"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5 19l.75 2.25L8 22l-2.25.75L5 25l-.75-2.25L2 22l2.25-.75L5 19z" />
          </svg>
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
          aria-label="Settings"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
          </svg>
        </button>
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-elevated ring-1 transition-all ${showProfileMenu ? "ring-primary" : "ring-border/50 hover:ring-border"
              }`}
            aria-label="Profile"
          >
            <span className="text-xs font-semibold text-textSecondary uppercase">OP</span>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-input border border-border/60 bg-elevated p-1 shadow-2xl z-50"
              >
                <div className="px-3 py-2 border-b border-border/20 mb-1">
                  <p className="text-xs font-bold text-textPrimary uppercase tracking-tight">Original Pro</p>
                  <p className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Free Tier Account</p>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profile Settings
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="13" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="13" width="7" height="7" rx="1" />
                    <rect x="13" y="13" width="7" height="7" rx="1" />
                  </svg>
                  My Library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowSignupModal(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add Account
                </button>

                <div className="my-1 h-px bg-border/20" />

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          localStorage.clear();
          navigate("/login");
        }}
        title="Account Logout"
        message="Are you sure you want to log out? You will need to sign in again to access your conversations."
        confirmText="Log Out"
        confirmVariant="danger"
      />

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
      />
    </header>
  );
}
