import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRecentConversations, type Conversation } from "../api/api";

type NavKey = "chat" | "models" | "settings";

type SidebarProps = {
  activeNav: NavKey;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  recentChats?: Conversation[];
  activeChatId?: string | null;
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
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function Sidebar({ activeNav, onNewChat, onSelectChat, onDeleteChat, recentChats: propsRecentChats, activeChatId }: SidebarProps) {
  const navigate = useNavigate();
  const [internalRecentChats, setInternalRecentChats] = useState<Conversation[]>([]);

  useEffect(() => {
    // Only fetch if not managed by parent or to keep it synchronized if parent is null
    getRecentConversations()
      .then((data) => setInternalRecentChats(data))
      .catch(() => { });
  }, []);

  const displayedRecentChats = propsRecentChats || internalRecentChats;
  const item = (key: NavKey, label: string, to: string) => {
    const on = activeNav === key;
    return (
      <Link
        to={to}
        style={key === "chat" ? { fontFamily: "'Space Grotesk', sans-serif" } : undefined}
        className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-headline font-semibold transition-colors ${on
          ? "bg-surface text-primary"
          : "text-textSecondary hover:bg-surface/60 hover:text-textPrimary"
          }`}
      >
        <span className={on ? "text-primary" : "text-textMuted"}>
          <NavIcon name={key} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-[260px] shrink-0 flex-col border-r border-border/40 bg-sidebar px-4 pb-6 pt-6">
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

      <button
        onClick={() => {
          if (onNewChat) {
            onNewChat();
          } else {
            navigate("/chat", { state: { newChat: true } });
          }
        }}
        className="mt-6 block w-full rounded-input bg-primary py-3 text-center text-sm font-semibold text-background shadow-[0_0_20px_rgba(217,255,0,0.25)] transition-colors hover:bg-primaryHover"
      >
        + New Chat
      </button>

      {displayedRecentChats && displayedRecentChats.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted px-3">
            Recent
          </p>
          {displayedRecentChats.map((chat) => (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => {
                  if (onSelectChat) {
                    onSelectChat(chat.id);
                  } else {
                    navigate("/chat", { state: { chatId: chat.id } });
                  }
                }}
                className={`w-full flex items-center justify-between rounded-input px-3 py-2 text-left text-sm transition-colors pr-8 ${
                  chat.id === activeChatId
                    ? "bg-surface text-primary"
                    : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                }`}
              >
                <span className="truncate">{chat.title}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeleteChat) {
                    onDeleteChat(chat.id);
                  }
                }}
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
        {item("models", "Models", "/library")}
        {item("settings", "Settings", "/settings")}
      </nav>

      <p className="mb-3 mt-10 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
        Library filters
      </p>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="flex items-center justify-between rounded-input px-3 py-2 text-left text-sm text-textSecondary transition-colors hover:bg-surface/80 hover:text-textPrimary"
        >
          <span>Archived</span>
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-medium text-textMuted">
            12
          </span>
        </button>
        <button
          type="button"
          className="flex items-center justify-between rounded-input px-3 py-2 text-left text-sm text-textSecondary transition-colors hover:bg-surface/80 hover:text-textPrimary"
        >
          <span>Star Marked</span>
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-medium text-textMuted">
            5
          </span>
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-border/30 pt-6">
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
    </aside>
  );
}
