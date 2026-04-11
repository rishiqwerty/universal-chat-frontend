import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

type LibraryCard = {
  id: string;
  modelDot: "primary" | "muted";
  modelLabel: string;
  title: string;
  description: string;
  tags: string[];
  critical?: boolean;
  timestamp: string;
  action?: string;
};

const cards: LibraryCard[] = [
  {
    id: "1",
    modelDot: "primary",
    modelLabel: "GPT-4O",
    title: "Implementing Event-Sourcing in…",
    description:
      "Walkthrough of aggregate design, snapshots, and replay strategies for a high-throughput ingestion pipeline with idempotent handlers.",
    tags: ["#backend", "#architecture"],
    timestamp: "OCT 24, 2023 • 14:20",
  },
  {
    id: "2",
    modelDot: "muted",
    modelLabel: "CLAUDE 3.5",
    title: "Security Audit: OAuth2 Flow Weaknesses",
    description:
      "Review of redirect URI validation, PKCE enforcement, and token rotation gaps discovered during a staged penetration test.",
    tags: ["#api-design", "#research"],
    critical: true,
    timestamp: "OCT 22, 2023 • 09:05",
    action: "Restore Session",
  },
  {
    id: "3",
    modelDot: "primary",
    modelLabel: "GPT-4O",
    title: "Latency Budget for Edge Inference",
    description:
      "Defining SLOs, cold start mitigation, and batching heuristics for a multi-region deployment with failover routing.",
    tags: ["#devops", "#architecture"],
    timestamp: "OCT 20, 2023 • 18:41",
  },
  {
    id: "4",
    modelDot: "muted",
    modelLabel: "GEMINI 1.5",
    title: "Schema Evolution for Analytics Events",
    description:
      "Compatibility matrix for Avro vs JSON contracts, consumer-driven tests, and deprecation windows across teams.",
    tags: ["#backend", "#debugging"],
    timestamp: "OCT 18, 2023 • 11:12",
  },
];

function ChatCard({ card }: { card: LibraryCard }) {
  return (
    <article className="flex flex-col rounded-card bg-surface p-5 ring-1 ring-border/30">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${card.modelDot === "primary" ? "bg-primary" : "bg-textMuted"}`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-textMuted">
          {card.modelLabel}
        </span>
      </div>
      <h3 className="mt-3 text-base font-bold leading-snug text-textPrimary">{card.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-textSecondary">{card.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {card.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-medium text-textSecondary"
          >
            {t}
          </span>
        ))}
        {card.critical ? (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-background">
            CRITICAL
          </span>
        ) : null}
      </div>
      {card.action ? (
        <button
          type="button"
          className="mt-5 w-full rounded-input bg-primary py-2.5 text-sm font-semibold text-background shadow-[0_0_16px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover"
        >
          {card.action}
        </button>
      ) : null}
      <p className={`text-[10px] font-semibold uppercase tracking-wide text-textMuted ${card.action ? "mt-4" : "mt-5"}`}>
        {card.timestamp}
      </p>
    </article>
  );
}

export default function Library() {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="chat" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-[220px] shrink-0 border-r border-border/30 bg-background px-4 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-textMuted">Model type</p>
            <ul className="mt-4 space-y-3 text-sm text-textSecondary">
              <li className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="accent-primary" />
                <span>GPT-4o Omniscience</span>
              </li>
              <li className="flex items-center gap-2">
                <input type="checkbox" className="accent-primary" />
                <span>Claude 3.5 Sonnet</span>
              </li>
              <li className="flex items-center gap-2">
                <input type="checkbox" className="accent-primary" />
                <span>Gemini 1.5 Pro</span>
              </li>
              <li className="flex items-center gap-2">
                <input type="checkbox" className="accent-primary" />
                <span>Llama 3.1 405B</span>
              </li>
            </ul>
            <p className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
              Time horizon
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  type="button"
                  className="w-full rounded-input bg-surface px-3 py-2 text-left font-medium text-primary"
                >
                  All Time
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full rounded-input px-3 py-2 text-left text-textSecondary transition-colors hover:bg-surface/80"
                >
                  Last 24 Hours
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full rounded-input px-3 py-2 text-left text-textSecondary transition-colors hover:bg-surface/80"
                >
                  Past Week
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full rounded-input px-3 py-2 text-left text-textSecondary transition-colors hover:bg-surface/80"
                >
                  This Month
                </button>
              </li>
            </ul>
            <p className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
              Popular tags
            </p>
            <div className="flex flex-wrap gap-2">
              {["#architecture", "#debugging", "#api-design", "#research"].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-background"
                >
                  {t}
                </span>
              ))}
            </div>
          </aside>
          <main className="relative min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">Chat Library</h1>
                <p className="mt-1 text-sm text-textSecondary">
                  Manage and audit your neural interactions across models.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-input border border-border/60 bg-transparent px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
                  </svg>
                  Batch Export
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-input border border-border/80 bg-transparent px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surface hover:text-textPrimary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                  </svg>
                  Delete Selected
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => (
                <ChatCard key={c.id} card={c} />
              ))}
            </div>
            <button
              type="button"
              className="fixed bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-background shadow-[0_0_20px_rgba(217,255,0,0.35)] transition-colors hover:bg-primaryHover"
              aria-label="Quick action"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              </svg>
            </button>
          </main>
        </div>
      </div>
    </div>
  );
}
