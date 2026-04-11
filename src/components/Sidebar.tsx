import { Link } from "react-router-dom";

type NavKey = "chat" | "models" | "settings";

type SidebarProps = {
  activeNav: NavKey;
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

export default function Sidebar({ activeNav }: SidebarProps) {
  const item = (key: NavKey, label: string, to: string) => {
    const on = activeNav === key;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-medium transition-colors ${
          on
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
      <div className="flex items-start gap-3">
        <LogoMark />
        <div>
          <p className="text-base font-bold leading-tight text-textPrimary">Neural Architect</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-textMuted">
            V1.0.4-BETA
          </p>
        </div>
      </div>

      <Link
        to="/chat"
        className="mt-6 block w-full rounded-input bg-primary py-3 text-center text-sm font-semibold text-background shadow-[0_0_20px_rgba(217,255,0,0.25)] transition-colors hover:bg-primaryHover"
      >
        + New Chat
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {item("chat", "Chat", "/chat")}
        {item("models", "Models", "/library")}
        {item("settings", "Settings", "/library")}
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
