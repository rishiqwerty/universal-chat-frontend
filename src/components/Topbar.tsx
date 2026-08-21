import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "./ConfirmModal";
import SignupModal from "./SignupModal";
import TopupModal from "./TopupModal";
import { getCreditBalance, resolveImagePath } from "../api/api";
import { getBalanceCheckInterval } from "../config";
import { useAuth } from "../context/AuthContext";

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
  isStarred?: boolean;
  onToggleStar?: () => void;
  isArchived?: boolean;
  onToggleArchive?: () => void;
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
  isStarred = false,
  onToggleStar,
  isArchived = false,
  onToggleArchive,
  isTempMode,
  onToggleTempMode,
  isAuthenticated = true,
  hideIncognito = false,
  leftContent
}: TopbarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [editingTitle, setEditingTitle] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatActionsMenu, setShowChatActionsMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showFuelTooltip, setShowFuelTooltip] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [animateTrigger, setAnimateTrigger] = useState(false);
  const prevCreditsRef = useRef<number | null>(null);

  useEffect(() => {
    if (credits !== null && credits !== prevCreditsRef.current) {
      setAnimateTrigger(true);
      const timer = setTimeout(() => setAnimateTrigger(false), 1000);
      prevCreditsRef.current = credits;
      return () => clearTimeout(timer);
    }
    prevCreditsRef.current = credits;
  }, [credits]);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const chatActionsMenuRef = useRef<HTMLDivElement>(null);
  const [showHamburger, setShowHamburger] = useState(true);

  useEffect(() => {
    const checkState = () => {
      const isMobile = window.innerWidth < 768;
      const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
      setShowHamburger(isMobile || isCollapsed);
    };
    checkState();
    window.addEventListener("sidebar-toggle", checkState);
    window.addEventListener("sidebar-open", checkState);
    window.addEventListener("sidebar-close", checkState);
    window.addEventListener("resize", checkState);
    return () => {
      window.removeEventListener("sidebar-toggle", checkState);
      window.removeEventListener("sidebar-open", checkState);
      window.removeEventListener("sidebar-close", checkState);
      window.removeEventListener("resize", checkState);
    };
  }, []);

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
    
    // Listen for manual balance update requests
    window.addEventListener("balance-update", fetchBalance);

    // Poll for balance updates when active
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchBalance();
    }, getBalanceCheckInterval() * 1000);
    
    return () => {
      window.removeEventListener("balance-update", fetchBalance);
      clearInterval(interval);
    };
  }, [fetchBalance]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (chatActionsMenuRef.current && !chatActionsMenuRef.current.contains(event.target as Node)) {
        setShowChatActionsMenu(false);
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

  const neonColor = credits !== null && credits < 10 
    ? "#ef4444" 
    : credits !== null && credits < 30 
      ? "#fbbf24" 
      : "#D9FF00";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-4 bg-background/70 backdrop-blur-xl px-4 sm:px-6 shadow-sm shadow-black/10 transition-all">
      {showHamburger && (
        <button
          onClick={() => window.dispatchEvent(new Event("sidebar-toggle"))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input text-textSecondary hover:bg-surface hover:text-textPrimary transition-colors"
          title="Open Sidebar"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      {leftContent}
      <div className={`relative min-w-0 flex-1 max-w-2xl flex items-center gap-2.5 ${leftContent ? "hidden md:flex" : ""}`}>
        {activeChatTitle != null && (
          <>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="w-full bg-transparent text-lg font-headline font-semibold text-textPrimary placeholder:text-textMuted focus:outline-none truncate"
              placeholder="Conversation Title"
            />
            {isArchived && (
              <span className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Archived
              </span>
            )}
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Chat Actions 3-Dots Menu (Star, Archive, Delete) */}
        {activeChatTitle != null && (onToggleStar || onToggleArchive || onDeleteChat) && (
          <div className="relative" ref={chatActionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowChatActionsMenu(!showChatActionsMenu)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                showChatActionsMenu
                  ? "bg-surface text-textPrimary ring-1 ring-border shadow-sm"
                  : isStarred
                    ? "text-yellow-400 bg-yellow-500/10 hover:bg-surface hover:text-yellow-300"
                    : "text-textMuted hover:text-textPrimary hover:bg-surface"
              }`}
              aria-label="Conversation Options"
              title="Conversation options"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="5" cy="12" r="2" />
              </svg>
            </button>

            <AnimatePresence>
              {showChatActionsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border/60 bg-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl z-50"
                >
                  {onToggleStar && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatActionsMenu(false);
                        onToggleStar();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                    >
                      <svg className={`h-4 w-4 ${isStarred ? "text-yellow-400 fill-yellow-400" : "text-textMuted"}`} viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>{isStarred ? "Unstar Chat" : "Star Chat"}</span>
                    </button>
                  )}

                  {onToggleArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatActionsMenu(false);
                        onToggleArchive();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                    >
                      {isArchived ? (
                        <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <polyline points="10 12 12 10 14 12" />
                          <line x1="12" y1="10" x2="12" y2="17" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                      )}
                      <span>{isArchived ? "Unarchive Chat" : "Archive Chat"}</span>
                    </button>
                  )}

                  {onDeleteChat && (
                    <>
                      <div className="my-1 h-px bg-border/20" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatActionsMenu(false);
                          onDeleteChat();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        <span>Delete Chat</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {isAuthenticated && !isTempMode && (
          <div className="flex items-center gap-1.5 px-2 relative group">
            <motion.button
              onClick={() => setShowTopupModal(true)}
              onMouseEnter={() => setShowFuelTooltip(true)}
              onMouseLeave={() => setShowFuelTooltip(false)}
              animate={animateTrigger ? {
                scale: [1, 1.08, 1],
                borderColor: [
                  credits !== null && credits < 10 ? "#ef4444" : credits !== null && credits < 30 ? "#fbbf24" : "#D9FF00",
                  credits !== null && credits < 10 ? "#ef4444" : credits !== null && credits < 30 ? "#fbbf24" : "#D9FF00"
                ],
                boxShadow: [
                  "0 0 0px rgba(0,0,0,0)",
                  credits !== null && credits < 10 
                    ? "0 0 25px rgba(239, 68, 68, 0.8)" 
                    : credits !== null && credits < 30 
                      ? "0 0 25px rgba(251, 191, 36, 0.8)" 
                      : "0 0 25px rgba(217, 255, 0, 0.8)",
                  "0 0 0px rgba(0,0,0,0)"
                ],
                transition: { duration: 0.8, ease: "easeInOut" }
              } : {
                scale: 1,
                borderColor: "rgba(42, 42, 45, 0.3)",
                boxShadow: "0 0 0px rgba(0,0,0,0)"
              }}
              whileHover={{
                scale: 1.02,
                borderColor: 
                  credits !== null && credits < 10 
                    ? "rgba(239, 68, 68, 0.3)" 
                    : credits !== null && credits < 30 
                      ? "rgba(251, 191, 36, 0.3)" 
                      : "rgba(217, 255, 0, 0.2)",
                boxShadow: 
                  credits !== null && credits < 10 
                    ? "0 0 12px rgba(239, 68, 68, 0.05)" 
                    : credits !== null && credits < 30 
                      ? "0 0 12px rgba(251, 191, 36, 0.05)" 
                      : "0 0 12px rgba(217, 255, 0, 0.04)"
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="group framer-btn flex h-9 items-center gap-2 rounded-input bg-elevated/50 pl-2.5 pr-3.5 border border-border/30 hover:bg-elevated"
            >
              <div className="flex h-6 w-5 items-center justify-center">
                <FuelGauge credits={credits} />
              </div>
              <div className="flex flex-col items-start -space-y-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors text-textPrimary ${credits !== null && credits < 10
                  ? "group-hover:text-red-500 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  : credits !== null && credits < 30
                    ? "group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : ""
                  }`}>
                  {credits !== null ? credits : "--"} CREDITS
                </span>
                <motion.span
                  animate={{
                    opacity: [0.75, 0.4, 0.85, 0.3, 0.85, 0.5, 0.85],
                    textShadow: [
                      `0 0 2px ${neonColor}33`,
                      `0 0 1px ${neonColor}11`,
                      `0 0 5px ${neonColor}99`,
                      `0 0 2px ${neonColor}33`,
                      `0 0 8px ${neonColor}cc`,
                      `0 0 3px ${neonColor}66`,
                      `0 0 8px ${neonColor}cc`
                    ]
                  }}
                  whileHover={{
                    opacity: 1,
                    textShadow: `0 0 10px ${neonColor}`
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "linear",
                    times: [0, 0.04, 0.06, 0.08, 0.1, 0.13, 1]
                  }}
                  className={`text-[8px] font-bold uppercase tracking-widest italic transition-colors text-primary ${credits !== null && credits < 10
                    ? "group-hover:text-red-400"
                    : credits !== null && credits < 30
                      ? "group-hover:text-amber-400"
                      : ""
                    }`}
                >
                  Refuel
                </motion.span>
              </div>
            </motion.button>

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
        {isAuthenticated && !hideIncognito && (
          <button
            type="button"
            onClick={() => {
              if (onToggleTempMode) {
                onToggleTempMode();
              }
            }}
            className={`flex h-9 items-center gap-2 rounded-input px-3 transition-all ${isTempMode
              ? "border border-dashed border-primary/50 bg-primary/5 text-primary shadow-[0_0_12px_rgba(217,255,0,0.15)] hover:bg-primary/10"
              : "text-textSecondary hover:bg-surface hover:text-textPrimary"
              }`}
            aria-label="Temporary Mode"
            title={isTempMode ? "Exit Temporary Mode" : "Start Temporary Chat"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11V7a4 4 0 118 0v4c0 1.28.192 2.515.547 3.672M12 11c1.744 2.772 2.753 6.054 2.753 9.571m-9.643-.513c-.322-.135-.351-.303-.351-.488V11a4 4 0 118 0v4c0 .185-.029.353-.351.488m-9.292-2.128a13.916 13.916 0 0113.111-9.444" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isTempMode ? "Go Public" : "Incognito"}
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
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={{
              scale: { type: "spring", stiffness: 400, damping: 15 },
              default: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="framer-btn flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-wider text-background hover:bg-primaryHover shadow-[0_0_15px_rgba(217,255,0,0.3)] transition-all"
          >
            Join
          </motion.button>
        )}
        {isAuthenticated && (
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-elevated ring-1 transition-all ${showProfileMenu ? "ring-primary shadow-[0_0_15px_rgba(217,255,0,0.3)]" : "ring-border/50 hover:ring-border hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                }`}
              aria-label="Profile"
            >
              {user?.avatar_url ? (
                <img
                  src={resolveImagePath(user.avatar_url)}
                  alt={user.full_name || "User Avatar"}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <span className="text-xs font-bold text-textPrimary uppercase">
                  {user?.full_name ? user.full_name.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : "OP")}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border/60 bg-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-border/20 mb-1">
                    <p className="text-xs font-bold text-textPrimary truncate" title={user?.full_name || user?.email || "Operative"}>
                      {user?.full_name || (user?.email ? user.email.split('@')[0] : "Operative")}
                    </p>
                    <p className="text-[10px] text-textMuted font-medium truncate mt-0.5" title={user?.email || "Account"}>
                      {user?.email || "Active Operative"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings?tab=profile");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                  >
                    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Profile Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/library");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                  >
                    <svg className="h-4 w-4 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Image Library
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSignupModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                  >
                    <svg className="h-4 w-4 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
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
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
        )}
      </div>
    </header>

    <ConfirmModal
      isOpen={showLogoutConfirm}
      onClose={() => setShowLogoutConfirm(false)}
      onConfirm={() => {
        logout();
        navigate("/login");
      }}
      title="Sign Out"
      message="Are you sure you want to log out of Neural Architect? You can sign back in anytime to access your saved conversations."
      confirmText="Sign Out"
      cancelText="Stay Signed In"
      confirmVariant="primary"
    />

    <SignupModal
      isOpen={showSignupModal}
      onClose={() => setShowSignupModal(false)}
    />

    <TopupModal
      isOpen={showTopupModal}
      onClose={() => setShowTopupModal(false)}
    />
  </>
);
}
