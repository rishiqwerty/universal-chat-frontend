import { useState, useEffect } from "react";

type TopbarProps = {
  activeChatTitle?: string | null;
  onUpdateTitle?: (newTitle: string) => void;
};

export default function Topbar({ activeChatTitle, onUpdateTitle }: TopbarProps) {
  const [editingTitle, setEditingTitle] = useState("");

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
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-elevated ring-1 ring-border/50"
          aria-label="Profile"
        >
          <span className="text-xs font-semibold text-textSecondary">OP</span>
        </button>
      </div>
    </header>
  );
}
