import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  getConversations, 
  starConversation, 
  unstarConversation, 
  archiveConversation, 
  unarchiveConversation,
  type Conversation 
} from "../api/api";
import HelpModal from "./HelpModal";

export type NavKey = "chat" | "studio" | "models" | "settings";
export type ChatFilterMode = "all" | "starred" | "archived";

const MAX_PREVIEW_CHATS = 8;
const MAX_PREVIEW_STARRED = 5;

type SidebarProps = {
  activeNav: NavKey;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onToggleStar?: (id: string, currentlyStarred: boolean) => void;
  onToggleArchive?: (id: string, currentlyArchived: boolean) => void;
  recentChats?: Conversation[];
  activeChatId?: string | null;
  isAuthenticated?: boolean;
  isLoadingRecent?: boolean;
  filterMode?: ChatFilterMode;
  onFilterChange?: (filter: ChatFilterMode) => void;
};

function LogoMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-elevated">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          fill="#D9FF00"
          d="M4 6h4v10H4V6zm6 0h4v4h-4V6zm0 6h4v4h-4v-4z"
        />
      </svg>
    </div>
  );
}

function NavIcon({ name }: { name: NavKey }) {
  const cls = "h-4 w-4";
  if (name === "chat") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 10h8M8 14h5M6 18l-2 2V6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6z" />
      </svg>
    );
  }
  if (name === "models") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === "studio") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  return null;
}

export default function Sidebar({ 
  activeNav, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat, 
  onToggleStar,
  onToggleArchive,
  recentChats: propsRecentChats, 
  activeChatId,
  isAuthenticated = true,
  isLoadingRecent,
  filterMode: propsFilterMode,
  onFilterChange: propsOnFilterChange
}: SidebarProps) {
  const navigate = useNavigate();
  const [internalAllChats, setInternalAllChats] = useState<Conversation[]>([]);
  const [internalFilterMode, setInternalFilterMode] = useState<ChatFilterMode>("all");
  const [loading, setLoading] = useState(isAuthenticated);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Collapsible section states
  const [isStarredCollapsed, setIsStarredCollapsed] = useState(false);
  const [isRecentCollapsed, setIsRecentCollapsed] = useState(false);

  // Show more states
  const [showAllStarred, setShowAllStarred] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const [isOpen, setIsOpen] = useState(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return false;
    return localStorage.getItem("sidebar_collapsed") !== "true";
  });

  const activeFilter = propsFilterMode !== undefined ? propsFilterMode : internalFilterMode;

  const handleFilterSelect = (mode: ChatFilterMode) => {
    if (propsOnFilterChange) {
      propsOnFilterChange(mode);
    } else {
      setInternalFilterMode(mode);
    }
  };

  const loadAllChats = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getConversations({ limit: 50 })
      .then((data) => setInternalAllChats(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAllChats();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleToggle() {
      setIsOpen((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar_collapsed", next ? "false" : "true");
        return next;
      });
    }
    function handleOpen() {
      setIsOpen(true);
      localStorage.setItem("sidebar_collapsed", "false");
    }
    function handleClose() {
      setIsOpen(false);
      localStorage.setItem("sidebar_collapsed", "true");
    }

    window.addEventListener("sidebar-toggle", handleToggle);
    window.addEventListener("sidebar-open", handleOpen);
    window.addEventListener("sidebar-close", handleClose);
    return () => {
      window.removeEventListener("sidebar-toggle", handleToggle);
      window.removeEventListener("sidebar-open", handleOpen);
      window.removeEventListener("sidebar-close", handleClose);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setIsOpen(false);
      } else {
        setIsOpen(localStorage.getItem("sidebar_collapsed") !== "true");
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isRecentLoading = isLoadingRecent !== undefined ? isLoadingRecent : loading;

  const sourceChats = propsRecentChats || internalAllChats;

  // Split into active, starred, and archived
  const activeChats = useMemo(() => sourceChats.filter((c) => !c.is_archived), [sourceChats]);
  const starredChats = useMemo(() => sourceChats.filter((c) => c.is_starred && !c.is_archived), [sourceChats]);
  const unstarredActiveChats = useMemo(() => sourceChats.filter((c) => !c.is_starred && !c.is_archived), [sourceChats]);
  const archivedChats = useMemo(() => sourceChats.filter((c) => c.is_archived), [sourceChats]);

  const handleInternalStar = async (chatId: string, currentlyStarred: boolean) => {
    if (onToggleStar) {
      onToggleStar(chatId, currentlyStarred);
      return;
    }
    setInternalAllChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, is_starred: !currentlyStarred } : c))
    );
    try {
      if (currentlyStarred) {
        await unstarConversation(chatId);
      } else {
        await starConversation(chatId);
      }
    } catch (err) {
      console.error("Failed to toggle star", err);
      loadAllChats();
    }
  };

  const handleInternalArchive = async (chatId: string, currentlyArchived: boolean) => {
    if (onToggleArchive) {
      onToggleArchive(chatId, currentlyArchived);
      return;
    }
    setInternalAllChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, is_archived: !currentlyArchived } : c))
    );
    try {
      if (currentlyArchived) {
        await unarchiveConversation(chatId);
      } else {
        await archiveConversation(chatId);
      }
    } catch (err) {
      console.error("Failed to toggle archive", err);
      loadAllChats();
    }
  };

  const renderRecentSkeleton = () => {
    const skeletonWidths = ["70%", "55%", "80%", "60%"];
    return (
      <div className="flex flex-col gap-1.5 px-3 animate-fade-in">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
          Recent
        </p>
        {skeletonWidths.map((width, idx) => (
          <div
            key={`recent-skeleton-${idx}`}
            className="relative overflow-hidden h-9 w-full rounded-input bg-surface/30 border border-border/10 backdrop-blur-md"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: idx * 0.15 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            />
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3 rounded bg-elevated/40" 
              style={{ width }} 
            />
          </div>
        ))}
      </div>
    );
  };

  const renderChatItem = (chat: Conversation) => (
    <div key={chat.id} className="group relative">
      <button
        onClick={() => {
          if (chat.id === activeChatId) return;
          if (onSelectChat) {
            onSelectChat(chat.id);
          } else {
            navigate("/chat", { state: { chatId: chat.id } });
          }
        }}
        className={`w-full flex items-center justify-between rounded-input px-3 py-2 text-left text-sm transition-colors pr-20 ${
          chat.id === activeChatId
            ? "bg-surface text-primary font-medium"
            : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {chat.is_starred && (
            <svg className="h-3 w-3 shrink-0 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          <span className="truncate">{chat.title}</span>
        </div>
      </button>

      {/* Quick Action buttons */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Star button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleInternalStar(chat.id, !!chat.is_starred);
          }}
          className={`p-1 rounded transition-colors ${
            chat.is_starred
              ? "text-yellow-400 hover:text-yellow-300"
              : "text-textMuted hover:text-yellow-400"
          }`}
          title={chat.is_starred ? "Remove star" : "Star conversation"}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={chat.is_starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Archive/Unarchive button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleInternalArchive(chat.id, !!chat.is_archived);
          }}
          className={`p-1 rounded transition-colors ${
            chat.is_archived
              ? "text-amber-400 hover:text-amber-300"
              : "text-textMuted hover:text-amber-400"
          }`}
          title={chat.is_archived ? "Unarchive conversation" : "Archive conversation"}
        >
          {chat.is_archived ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <polyline points="10 12 12 10 14 12" />
              <line x1="12" y1="10" x2="12" y2="17" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          )}
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            if (onDeleteChat) onDeleteChat(chat.id); 
          }}
          className="p-1 rounded text-textMuted hover:text-red-500 transition-colors"
          title="Delete conversation"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => window.dispatchEvent(new Event("sidebar-toggle"))}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full min-h-0 flex-col bg-sidebar pb-4 pt-5 transition-all duration-300 ease-in-out border-border/40
          md:relative md:z-0
          ${isOpen 
            ? "w-[260px] translate-x-0 border-r px-3.5" 
            : "w-0 -translate-x-full overflow-hidden border-r-0 px-0 md:w-0 md:-translate-x-full md:px-0"
          }
        `}
      >
        <div className="flex flex-col h-full w-[232px] shrink-0">
          {/* Logo & Header */}
          <div className="flex items-center justify-between">
            <div 
              className="flex items-start gap-2.5 cursor-pointer group"
              onClick={() => {
                if (onNewChat) {
                  onNewChat();
                } else {
                  navigate("/chat", { state: { newChat: true } });
                }
              }}
            >
              <div className="transition-transform group-hover:scale-110 duration-200">
                <LogoMark />
              </div>
              <div>
                <p className="text-base font-headline font-bold leading-tight text-textPrimary group-hover:text-primary transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Neural Architect</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-textMuted">
                  V1.0.4-BETA
                </p>
              </div>
            </div>

            {/* Collapse/Close Button */}
            <button
              onClick={() => window.dispatchEvent(new Event("sidebar-toggle"))}
              className="flex h-8 w-8 items-center justify-center rounded-input text-textMuted hover:bg-surface hover:text-textPrimary transition-all"
              title="Close Sidebar"
            >
              {/* Mobile: Close Icon */}
              <svg className="block md:hidden h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {/* Desktop: Double Left Chevron */}
              <svg className="hidden md:block h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Top Actions: + New Chat & Studio */}
          <div className="mt-4 flex flex-col gap-3 shrink-0">
            <button
              onClick={() => {
                if (onNewChat) {
                  onNewChat();
                } else {
                  navigate("/chat", { state: { newChat: true } });
                }
              }}
              className="block w-full rounded-input bg-primary py-2.5 text-center text-sm font-semibold text-background shadow-[0_0_16px_rgba(var(--color-primary),0.2)] transition-colors hover:bg-primaryHover"
            >
              + New Chat
            </button>

            {isAuthenticated && (
              <Link
                to="/studio"
                className={`flex items-center gap-2.5 rounded-input px-3 py-2 text-sm font-headline font-semibold transition-all ${
                  activeNav === "studio"
                    ? "bg-surface text-primary"
                    : "text-primary/90 bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:text-primary shadow-[0_0_10px_rgba(var(--color-primary),0.06)]"
                }`}
              >
                <NavIcon name="studio" />
                <span>Studio</span>
                {activeNav !== "studio" && (
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">
                    New
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Scrollable middle section: Starred, Recent Chats & Library Filters */}
          <div className="mt-4 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            {isAuthenticated && (
              isRecentLoading ? (
                renderRecentSkeleton()
              ) : activeFilter === "all" ? (
                <div className="flex flex-col gap-2">
                  {/* 1. STARRED CHATS (AT TOP) */}
                  {starredChats.length > 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setIsStarredCollapsed(!isStarredCollapsed)}
                        className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-textMuted hover:text-textPrimary transition-colors group select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <svg 
                            className={`h-3 w-3 text-textMuted group-hover:text-textPrimary transition-transform duration-200 ${
                              isStarredCollapsed ? "-rotate-90" : "rotate-0"
                            }`} 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <svg className="h-3 w-3 fill-yellow-400" viewBox="0 0 24 24">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span className="text-textMuted group-hover:text-textPrimary font-bold">Starred</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-textMuted bg-surface/60 px-1.5 py-0.2 rounded">
                          {starredChats.length}
                        </span>
                      </button>

                      {!isStarredCollapsed && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {(showAllStarred ? starredChats : starredChats.slice(0, MAX_PREVIEW_STARRED)).map(renderChatItem)}
                          {starredChats.length > MAX_PREVIEW_STARRED && (
                            <button
                              type="button"
                              onClick={() => setShowAllStarred(!showAllStarred)}
                              className="px-3 py-1 text-left text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors"
                            >
                              {showAllStarred ? "Show less" : `+${starredChats.length - MAX_PREVIEW_STARRED} more starred`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. RECENT CHATS */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setIsRecentCollapsed(!isRecentCollapsed)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-textMuted hover:text-textPrimary transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <svg 
                          className={`h-3 w-3 text-textMuted group-hover:text-textPrimary transition-transform duration-200 ${
                            isRecentCollapsed ? "-rotate-90" : "rotate-0"
                          }`} 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="font-bold">Recent</span>
                      </div>
                      <span className="text-[10px] font-medium text-textMuted bg-surface/60 px-1.5 py-0.2 rounded">
                        {unstarredActiveChats.length}
                      </span>
                    </button>

                    {!isRecentCollapsed && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {unstarredActiveChats.length > 0 ? (
                          <>
                            {(showAllRecent ? unstarredActiveChats : unstarredActiveChats.slice(0, MAX_PREVIEW_CHATS)).map(renderChatItem)}
                            {unstarredActiveChats.length > MAX_PREVIEW_CHATS && (
                              <button
                                type="button"
                                onClick={() => setShowAllRecent(!showAllRecent)}
                                className="px-3 py-1 text-left text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors"
                              >
                                {showAllRecent ? "Show less" : `+${unstarredActiveChats.length - MAX_PREVIEW_CHATS} more chats`}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-3 text-center">
                            <p className="text-xs text-textMuted">No recent conversations.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeFilter === "starred" ? (
                /* STARRED FILTER VIEW */
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2.5 mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                      <svg className="h-3 w-3 fill-yellow-400" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Starred Chats
                    </p>
                    <button
                      type="button"
                      onClick={() => handleFilterSelect("all")}
                      className="text-[9px] font-bold uppercase text-primary hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  {starredChats.length > 0 ? (
                    starredChats.map(renderChatItem)
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-textMuted leading-relaxed">
                        No starred conversations yet.<br />Click the star icon to favorite chats.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ARCHIVED FILTER VIEW */
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2.5 mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                      Archived Chats
                    </p>
                    <button
                      type="button"
                      onClick={() => handleFilterSelect("all")}
                      className="text-[9px] font-bold uppercase text-primary hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  {archivedChats.length > 0 ? (
                    archivedChats.map(renderChatItem)
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-textMuted leading-relaxed">
                        No archived conversations.
                      </p>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Library filters */}
            {isAuthenticated && (
              <div className="mt-5 border-t border-border/20 pt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted px-2.5">
                  Library filters
                </p>
                <div className="flex flex-col gap-1">
                  {/* All active filter */}
                  <button 
                    type="button" 
                    onClick={() => handleFilterSelect("all")}
                    className={`flex items-center justify-between rounded-input px-2.5 py-1.5 text-left text-xs transition-colors ${
                      activeFilter === "all"
                        ? "bg-surface text-primary font-bold border border-primary/20"
                        : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                    }`}
                  >
                    <span>All Chats</span>
                    <span className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      activeFilter === "all" ? "bg-primary/20 text-primary" : "bg-elevated text-textMuted"
                    }`}>
                      {activeChats.length}
                    </span>
                  </button>

                  {/* Star Marked filter */}
                  <button 
                    type="button" 
                    onClick={() => handleFilterSelect("starred")}
                    className={`flex items-center justify-between rounded-input px-2.5 py-1.5 text-left text-xs transition-colors ${
                      activeFilter === "starred"
                        ? "bg-surface text-primary font-bold border border-primary/20"
                        : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3 w-3 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>Star Marked</span>
                    </div>
                    <span className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      activeFilter === "starred" ? "bg-primary/20 text-primary" : "bg-elevated text-textMuted"
                    }`}>
                      {starredChats.length}
                    </span>
                  </button>

                  {/* Archived filter */}
                  <button 
                    type="button" 
                    onClick={() => handleFilterSelect("archived")}
                    className={`flex items-center justify-between rounded-input px-2.5 py-1.5 text-left text-xs transition-colors ${
                      activeFilter === "archived"
                        ? "bg-surface text-primary font-bold border border-primary/20"
                        : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                      <span>Archived</span>
                    </div>
                    <span className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                      activeFilter === "archived" ? "bg-primary/20 text-primary" : "bg-elevated text-textMuted"
                    }`}>
                      {archivedChats.length}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section: Settings, Help, Documentation, Legal */}
          <div className="mt-auto shrink-0 flex flex-col gap-1 border-t border-border/30 pt-3">
            {isAuthenticated && (
              <Link
                to="/settings"
                className={`flex items-center gap-2 rounded-input px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeNav === "settings"
                    ? "bg-surface text-primary font-semibold"
                    : "text-textMuted hover:bg-surface/60 hover:text-textPrimary"
                }`}
              >
                <NavIcon name="settings" />
                <span>Settings</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center gap-2 rounded-input px-2.5 py-1.5 text-xs text-textMuted transition-colors hover:bg-surface/60 hover:text-textPrimary"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 9a3 3 0 115.196 2.196M12 17h.01" />
              </svg>
              <span>Help</span>
            </button>
            <Link
              to="/docs"
              className="flex items-center gap-2 rounded-input px-2.5 py-1.5 text-xs text-textMuted transition-colors hover:bg-surface/60 hover:text-textPrimary"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h10M4 18h14" />
              </svg>
              <span>Documentation</span>
            </Link>
            <Link
              to="/terms"
              className="flex items-center gap-2 rounded-input px-2.5 py-1.5 text-xs text-textMuted transition-colors hover:bg-surface/60 hover:text-textPrimary"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Legal & Policies</span>
            </Link>
          </div>
        </div>
      </aside>

      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />
    </>
  );
}
