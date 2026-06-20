import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRecentConversations, type Conversation } from "../api/api";

type NavKey = "chat" | "studio" | "models" | "settings";

type SidebarProps = {
  activeNav: NavKey;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  recentChats?: Conversation[];
  activeChatId?: string | null;
  isAuthenticated?: boolean;
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
  const cls = "h-5 w-5";
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
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function Sidebar({ 
  activeNav, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat, 
  recentChats: propsRecentChats, 
  activeChatId,
  isAuthenticated = true
}: SidebarProps) {
  const navigate = useNavigate();
  const [internalRecentChats, setInternalRecentChats] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return false;
    return localStorage.getItem("sidebar_collapsed") !== "true";
  });

  useEffect(() => {
    // Only fetch if not managed by parent or to keep it synchronized if parent is null
    getRecentConversations()
      .then((data) => setInternalRecentChats(data))
      .catch(() => { });
  }, []);

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

  const displayedRecentChats = propsRecentChats || internalRecentChats;
  const item = (key: NavKey, label: string, to: string) => {
    const on = activeNav === key;
    const isStudio = key === "studio";
    return (
      <Link
        to={to}
        style={key === "chat" ? { fontFamily: "'Space Grotesk', sans-serif" } : undefined}
        className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-headline font-semibold transition-all ${on
          ? "bg-surface text-primary"
          : isStudio
            ? "text-primary/80 bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:text-primary shadow-[0_0_12px_rgba(var(--color-primary),0.08)]"
            : "text-textSecondary hover:bg-surface/60 hover:text-textPrimary"
          }`}
      >
        <span className={on ? "text-primary" : isStudio && !on ? "text-primary" : "text-textMuted"}>
          <NavIcon name={key} />
        </span>
        {label}
        {isStudio && !on && (
          <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">
            New
          </span>
        )}
      </Link>
    );
  };

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
          fixed inset-y-0 left-0 z-50 flex h-full min-h-0 flex-col bg-sidebar pb-6 pt-6 transition-all duration-300 ease-in-out border-border/40
          md:relative md:z-0
          ${isOpen 
            ? "w-[260px] translate-x-0 border-r px-4" 
            : "w-0 -translate-x-full overflow-hidden border-r-0 px-0 md:w-0 md:-translate-x-full md:px-0"
          }
        `}
      >
        <div className="flex flex-col h-full w-[228px] shrink-0">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-start gap-3 cursor-pointer group"
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
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-textMuted">
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

          <button
            onClick={() => {
              if (onNewChat) {
                onNewChat();
              } else {
                navigate("/chat", { state: { newChat: true } });
              }
            }}
            className="mt-6 block w-full shrink-0 rounded-input bg-primary py-3 text-center text-sm font-semibold text-background shadow-[0_0_20px_rgba(var(--color-primary),0.25)] transition-colors hover:bg-primaryHover"
          >
            + New Chat
          </button>

          {/* Scrollable middle section */}
          <div className="mt-4 flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            {isAuthenticated && displayedRecentChats && displayedRecentChats.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted px-3">
                  Recent
                </p>
                {displayedRecentChats.map((chat) => (
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
                      className={`w-full flex items-center justify-between rounded-input px-3 py-2 text-left text-sm transition-colors pr-8 ${chat.id === activeChatId
                        ? "bg-surface text-primary"
                        : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                        }`}
                    >
                      <span className="truncate">{chat.title}</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); if (onDeleteChat) onDeleteChat(chat.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-textMuted opacity-0 group-hover:opacity-100 transition-all hover:text-red-500"
                      title="Delete conversation"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <nav className="mt-8 flex flex-col gap-1">
              {isAuthenticated && item("studio", "Studio", "/studio")}
              {/* {isAuthenticated && item("models", "Models", "/library")} */}
              {isAuthenticated && item("settings", "Settings", "/settings")}
            </nav>

            {isAuthenticated && (
              <>
                <p className="mb-3 mt-10 text-[10px] font-semibold uppercase tracking-wider text-textMuted px-3">
                  Library filters
                </p>
                <div className="flex flex-col gap-1">
                  <button type="button" className="flex items-center justify-between rounded-input px-3 py-2 text-left text-sm text-textSecondary hover:bg-surface/80 hover:text-textPrimary">
                    <span>Archived</span>
                    <span className="rounded bg-elevated px-2 py-0.5 text-xs font-medium text-textMuted">12</span>
                  </button>
                  <button type="button" className="flex items-center justify-between rounded-input px-3 py-2 text-left text-sm text-textSecondary hover:bg-surface/80 hover:text-textPrimary">
                    <span>Star Marked</span>
                    <span className="rounded bg-elevated px-2 py-0.5 text-xs font-medium text-textMuted">5</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-auto shrink-0 flex flex-col gap-2 border-t border-border/30 pt-6">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-textMuted transition-colors hover:text-textSecondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 9a3 3 0 115.196 2.196M12 17h.01" />
              </svg>
              Help
            </button>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-textMuted transition-colors hover:text-textSecondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h10M4 18h14" />
              </svg>
              Documentation
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
