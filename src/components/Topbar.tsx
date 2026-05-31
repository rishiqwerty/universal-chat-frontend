import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "./ConfirmModal";
import SignupModal from "./SignupModal";
import TopupModal from "./TopupModal";
import { getCreditBalance } from "../api/api";

function FuelGauge({ credits }: { credits: number | null }) {
  const percentage = credits !== null ? Math.min(Math.max(credits, 0), 100) : 0;

  const color =
    credits === null || credits >= 30 ? "#D9FF00" :
      credits >= 10 ? "#fbbf24" : "#ef4444";

  return (
    <div className="relative h-5 w-3.5 flex flex-col justify-end group-hover:scale-110 transition-transform duration-300">
      {/* Tank Cap */}
      <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1.5 h-[2px] bg-border/80 rounded-t-[1px]" />

      {/* Tank Body */}
      <div className="absolute inset-0 border border-border/60 rounded-[3px] bg-background/20" />

      {/* Glass Reflection */}
      <div className="absolute top-0.5 left-0.5 bottom-0.5 w-[1px] bg-white/5 rounded-full z-20 pointer-events-none" />

      {/* Liquid Container */}
      <div className="absolute inset-[1px] bottom-[1px] overflow-hidden rounded-[1.5px] bg-black/20 flex flex-col justify-end">
        <motion.div
          initial={{ height: "0%" }}
          animate={{ height: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 40, damping: 12, mass: 1 }}
          className="w-full relative"
          style={{ 
            backgroundColor: color,
          }}
        >
          {/* Internal Glowing Pulse */}
          <motion.div
            className="absolute inset-0 z-0"
            animate={{ 
              boxShadow: [
                `0 0 4px ${color}aa`,
                `0 0 12px ${color}ff`,
                `0 0 4px ${color}aa`
              ]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />

          {/* Animated Liquid Wave/Surface */}
          <motion.div 
            className="absolute -top-1 left-[-150%] w-[400%] h-1.5 opacity-40 mix-blend-screen"
            style={{
              background: `radial-gradient(circle at center, white 0%, transparent 70%)`,
              backgroundColor: color,
              borderRadius: "45% 45% 0 0",
            }}
            animate={{
              x: ["-25%", "0%"],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              x: { duration: 3, repeat: Infinity, ease: "linear" },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          />

          {/* Internal Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20" />
        </motion.div>
      </div>

      {/* Outer Pulse for Critical */}
      {credits !== null && credits < 10 && (
        <motion.div
          className="absolute -inset-1 rounded-[5px] border border-red-500/30"
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

type TopbarProps = {
  activeChatTitle?: string | null;
  onUpdateTitle?: (newTitle: string) => void;
  onDeleteChat?: () => void;
  isTempMode?: boolean;
  onToggleTempMode?: () => void;
  isAuthenticated?: boolean;
  hideIncognito?: boolean;
  leftContent?: React.ReactNode;
};

export default function Topbar({
  activeChatTitle,
  onUpdateTitle,
  onDeleteChat,
  isTempMode,
  onToggleTempMode,
  isAuthenticated = true,
  hideIncognito = false,
  leftContent
}: TopbarProps) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showFuelTooltip, setShowFuelTooltip] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const fetchBalance = useCallback(async () => {
    if (isAuthenticated && !isTempMode) {
      try {
        const data = await getCreditBalance();
        setCredits(data.balance);
      } catch (err) {
        console.error("Failed to fetch credits", err);
      }
    }
  }, [isAuthenticated, isTempMode]);

  useEffect(() => {
    fetchBalance();
    // Poll every 30 seconds for balance updates (e.g. from chat deductions)
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

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
      (e.currentTarget as HTMLInputElement).blur();
    }
  }

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-border/30 bg-background px-6">
      {leftContent}
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
        {isAuthenticated && !isTempMode && (
          <div className="flex items-center gap-1.5 px-2 relative group">
            <button
              onClick={() => setShowTopupModal(true)}
              onMouseEnter={() => setShowFuelTooltip(true)}
              onMouseLeave={() => setShowFuelTooltip(false)}
              className={`group flex h-9 items-center gap-2 rounded-input bg-elevated/50 pl-2.5 pr-3.5 border transition-all hover:bg-elevated hover:scale-[1.02] active:scale-[0.98] ${credits !== null && credits < 10
                ? "border-red-500/50 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : credits !== null && credits < 30
                  ? "border-amber-500/50 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "border-border/30 hover:border-primary/30"
                }`}
            >
              <div className="flex h-6 w-5 items-center justify-center">
                <FuelGauge credits={credits} />
              </div>
              <div className="flex flex-col items-start -space-y-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${credits !== null && credits < 10
                  ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  : credits !== null && credits < 30
                    ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : "text-textPrimary"
                  }`}>
                  {credits !== null ? credits : "--"} CREDITS
                </span>
                <span className={`text-[8px] font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 italic transition-colors ${credits !== null && credits < 10
                  ? "text-red-400"
                  : credits !== null && credits < 30
                    ? "text-amber-400"
                    : "text-primary"
                  }`}>
                  Refuel
                </span>
              </div>
            </button>

            {/* Custom Tooltip */}
            <AnimatePresence>
              {showFuelTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-3 z-50 w-52 pointer-events-none"
                >
                  <div className="relative rounded-xl border border-primary/20 bg-elevated/95 p-3 shadow-2xl backdrop-blur-md">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Credit Usage</span>
                        <p className="text-[11px] leading-relaxed text-textSecondary">
                          Use credits to generate <span className="text-textPrimary font-semibold">images and videos</span>.
                        </p>
                      </div>
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-primary/20 bg-elevated/95" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
        {!hideIncognito && (
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                setShowSignupModal(true);
              } else if (onToggleTempMode) {
                onToggleTempMode();
              }
            }}
            className={`flex h-9 items-center gap-2 rounded-input px-3 transition-all ${isTempMode
              ? "border border-dashed border-primary/50 bg-primary/5 text-primary shadow-[0_0_12px_rgba(217,255,0,0.15)] hover:bg-primary/10"
              : "text-textSecondary hover:bg-surface hover:text-textPrimary"
              }`}
            aria-label="Temporary Mode"
            title={!isAuthenticated ? "Login to save chats" : (isTempMode ? "Exit Temporary Mode" : "Start Temporary Chat")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11V7a4 4 0 118 0v4c0 1.28.192 2.515.547 3.672M12 11c1.744 2.772 2.753 6.054 2.753 9.571m-9.643-.513c-.322-.135-.351-.303-.351-.488V11a4 4 0 118 0v4c0 .185-.029.353-.351.488m-9.292-2.128a13.916 13.916 0 0113.111-9.444" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {!isAuthenticated ? "Guest Mode" : (isTempMode ? "Go Public" : "Incognito")}
            </span>
          </button>
        )}
        {!isAuthenticated && (
          <motion.button
            type="button"
            onClick={() => setShowSignupModal(true)}
            animate={{
              boxShadow: [
                "0 0 15px rgba(217,255,0,0.3)",
                "0 0 25px rgba(217,255,0,0.6)",
                "0 0 15px rgba(217,255,0,0.3)"
              ],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex h-9 items-center gap-2 rounded-input bg-primary px-4 text-xs font-bold uppercase tracking-wider text-background transition-all hover:bg-primaryHover active:scale-[0.98]"
          >
            Join / Sign In
          </motion.button>
        )}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-elevated ring-1 transition-all ${showProfileMenu ? "ring-primary shadow-[0_0_15px_rgba(217,255,0,0.3)]" : "ring-border/50 hover:ring-border hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
              }`}
            aria-label="Profile"
          >
            {isAuthenticated ? (
              <span className="text-xs font-semibold text-textSecondary uppercase">
                OP
              </span>
            ) : (
              <motion.div
                className="relative h-full w-full flex items-center justify-center p-0.5"
                initial="initial"
                animate="guiding"
              >
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-primary/10 blur-md rounded-full" />

                {/* The Mascot */}
                <motion.img
                  src="/mascot_avatar.png"
                  alt="Assistant"
                  className="h-full w-full object-cover rounded-full relative z-10"
                  variants={{
                    initial: { rotate: 0, scale: 1 },
                    guiding: {
                      rotateX: [0, 15, 0, 0, 0],
                      rotateY: [0, -25, 0, 0, 0],
                      scale: [1, 1.05, 1, 1, 1],
                      transition: {
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        times: [0, 0.2, 0.4, 0.8, 1]
                      }
                    }
                  }}
                />

                {/* Continuous Wave Layer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none z-20"
                  animate={{
                    rotate: [-2, 2, -2],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            )}
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
                  <p className="text-xs font-bold text-textPrimary uppercase tracking-tight">
                    {isAuthenticated ? "Original Pro" : "Guest Operative"}
                  </p>
                  <p className="text-[10px] text-textMuted font-medium uppercase tracking-wider">
                    {isAuthenticated ? "Free Tier Account" : "Temporary Session"}
                  </p>
                </div>

                {isAuthenticated && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Profile Settings
                  </button>
                )}
                {isAuthenticated && (
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
                )}
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
                  {isAuthenticated ? "Add Account" : "Sign In / Join"}
                </button>

                <div className="my-1 h-px bg-border/20" />

                {isAuthenticated && (
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
                )}
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

      <TopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        onSuccess={(newBalance) => setCredits(newBalance)}
      />
    </header>
  );
}
