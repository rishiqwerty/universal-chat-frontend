import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getDocumentDetails, type DocDetail } from "../api/api";
import PageTransition from "../components/PageTransition";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { useDocumentSEO } from "../hooks/useDocumentSEO";

export type LegalDocKey =
  | "terms-and-conditions"
  | "privacy-policy"
  | "refund-policy"
  | "pricing"
  | "delivery-policy"
  | "contact-us";

interface LegalTabConfig {
  id: LegalDocKey;
  title: string;
  shortTitle: string;
  badge: string;
  description: string;
  routes: string[];
}

export const LEGAL_TABS: LegalTabConfig[] = [
  {
    id: "terms-and-conditions",
    title: "Terms & Conditions",
    shortTitle: "Terms of Service",
    badge: "Agreement",
    description: "User agreement, account responsibilities, intellectual property, and acceptable use guidelines.",
    routes: ["/terms", "/terms-and-conditions", "/terms-of-service"],
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    shortTitle: "Privacy Policy",
    badge: "Data Privacy",
    description: "How we collect, protect, process, and handle your personal data and AI workspace interactions.",
    routes: ["/privacy", "/privacy-policy"],
  },
  {
    id: "refund-policy",
    title: "Cancellation & Refund Policy",
    shortTitle: "Refund Policy",
    badge: "Billing",
    description: "Digital credits fulfillment, payment terms, cancellation rules, and refund eligibility standards.",
    routes: ["/refunds", "/refund-policy", "/cancellation-refund"],
  },
  {
    id: "pricing",
    title: "Pricing & Credit Plans",
    shortTitle: "Pricing Policy",
    badge: "Credits",
    description: "Credit package tiers, generative model rates, pay-as-you-go parameters, and zero-surcharge BYOK rules.",
    routes: ["/pricing", "/pricing-policy", "/plans"],
  },
  {
    id: "delivery-policy",
    title: "Shipping & Delivery Policy",
    shortTitle: "Delivery Policy",
    badge: "Fulfillment",
    description: "Instant electronic delivery and account balance allocation for digital software credits.",
    routes: ["/delivery", "/delivery-policy", "/shipping-policy"],
  },
  {
    id: "contact-us",
    title: "Contact Us & Support",
    shortTitle: "Contact Us",
    badge: "Support",
    description: "Official customer service channels, grievance officer contact, support SLA, and office details.",
    routes: ["/contact", "/contact-us", "/support"],
  },
];

function LegalIcon({ type, className = "h-4 w-4" }: { type: LegalDocKey; className?: string }) {
  switch (type) {
    case "terms-and-conditions":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "privacy-policy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "refund-policy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <path d="M16 15h2" />
          <path d="M6 15h4" />
        </svg>
      );
    case "pricing":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      );
    case "delivery-policy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "contact-us":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

export default function Legal() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ slug?: string }>();
  const { isAuthenticated } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resolve active tab from current URL path or parameter
  const initialTab = useMemo<LegalDocKey>(() => {
    const currentPath = location.pathname.toLowerCase();

    // Check specific routes
    for (const tab of LEGAL_TABS) {
      if (tab.routes.includes(currentPath)) {
        return tab.id;
      }
    }

    // Check slug param
    if (params.slug) {
      const match = LEGAL_TABS.find((t) => t.id === params.slug || t.routes.some((r) => r.includes(params.slug!)));
      if (match) return match.id;
    }

    return "terms-and-conditions";
  }, [location.pathname, params.slug]);

  // Read optional version from URL query param (e.g. /privacy?v=v1.0)
  const queryVersion = useMemo(() => {
    return new URLSearchParams(location.search).get("v") || "";
  }, [location.search]);

  const [activeTabId, setActiveTabId] = useState<LegalDocKey>(initialTab);
  const [selectedVersion, setSelectedVersion] = useState<string>(queryVersion);
  const [docContent, setDocContent] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setVersionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchronize state with route changes
  useEffect(() => {
    setActiveTabId(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedVersion(queryVersion);
  }, [queryVersion]);

  const activeTabConfig = useMemo(() => {
    return LEGAL_TABS.find((t) => t.id === activeTabId) || LEGAL_TABS[0];
  }, [activeTabId]);

  useDocumentSEO({
    title: `${activeTabConfig.title}${selectedVersion ? ` (${selectedVersion})` : ""} | Neural Architect`,
    description: activeTabConfig.description,
  });

  // Fetch document details exclusively from backend API
  const fetchLegalDocument = (tabId: LegalDocKey, version?: string) => {
    setLoading(true);
    setError(null);

    getDocumentDetails(tabId, version || undefined)
      .then((data) => {
        if (data && data.content_markdown) {
          setDocContent(data);
        } else {
          setError("Document content is empty.");
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch legal document ${tabId}:`, err);
        setError("Failed to load policy from server. Please check your connection or try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLegalDocument(activeTabId, selectedVersion);
  }, [activeTabId, selectedVersion]);

  const handleSelectTab = (tabId: LegalDocKey) => {
    setActiveTabId(tabId);
    setSelectedVersion("");
    const targetTab = LEGAL_TABS.find((t) => t.id === tabId);
    if (targetTab && targetTab.routes[0]) {
      navigate(targetTab.routes[0]);
    }
  };

  const handleSelectVersion = (versionStr: string) => {
    setSelectedVersion(versionStr);
    setVersionDropdownOpen(false);
    const targetTab = LEGAL_TABS.find((t) => t.id === activeTabId);
    const basePath = targetTab ? targetTab.routes[0] : location.pathname;
    if (versionStr) {
      navigate(`${basePath}?v=${encodeURIComponent(versionStr)}`);
    } else {
      navigate(basePath);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filter tabs based on search
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_TABS;
    const q = searchQuery.toLowerCase();
    return LEGAL_TABS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="settings" isAuthenticated={isAuthenticated} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar hideIncognito={true} />

          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-6xl">
              {/* Header Hero */}
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-surface/60 p-6 backdrop-blur-xl md:p-8">
                <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Legal & Compliance Hub</span>
                    </div>
                    <h1 className="mt-3 font-headline text-2xl font-black tracking-tight text-textPrimary md:text-3xl">
                      Compliance & Policies
                    </h1>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-textSecondary sm:text-sm">
                      Transparent legal terms, payment processing standards, data protection protocols, and support channels for the Neural Architect ecosystem.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 rounded-input border border-border bg-elevated/80 px-3.5 py-2 text-xs font-semibold text-textPrimary transition-all hover:border-primary/50 hover:bg-elevated active:scale-95"
                    >
                      <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                    </button>

                    <Link
                      to="/"
                      className="flex items-center gap-1.5 rounded-input bg-primary px-4 py-2 text-xs font-bold text-background shadow-[0_0_16px_rgba(217,255,0,0.25)] transition-all hover:bg-primaryHover active:scale-95"
                    >
                      <span>← Back to App</span>
                    </Link>
                  </div>
                </div>

                {/* Subtle Background Glow */}
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl"
                  aria-hidden
                />
              </div>

              {/* Main Content Layout */}
              <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Left Sidebar Navigation */}
                <div className="lg:col-span-4 flex flex-col gap-3 lg:sticky lg:top-4">
                  {/* Search / Filter Input */}
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search policy sections..."
                      className="h-10 w-full rounded-input border border-border/50 bg-surface/80 pl-10 pr-3 text-xs text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                    Policy Documents
                  </p>

                  <div className="flex flex-col gap-2">
                    {filteredTabs.map((tab) => {
                      const isActive = tab.id === activeTabId;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSelectTab(tab.id)}
                          className={`group relative flex flex-col rounded-xl border p-3.5 text-left transition-all duration-200 ${isActive
                              ? "border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(217,255,0,0.06)]"
                              : "border-border/30 bg-surface hover:border-border/60 hover:bg-surface/80"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${isActive
                                    ? "border-primary/40 bg-primary/20 text-primary"
                                    : "border-border/40 bg-elevated/50 text-textMuted group-hover:border-border group-hover:text-textPrimary"
                                  }`}
                              >
                                <LegalIcon type={tab.id} className="h-3.5 w-3.5" />
                              </div>
                              <span
                                className={`text-xs font-bold transition-colors ${isActive ? "text-primary" : "text-textPrimary group-hover:text-textPrimary"
                                  }`}
                              >
                                {tab.title}
                              </span>
                            </div>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isActive
                                  ? "bg-primary text-background"
                                  : "bg-elevated text-textMuted group-hover:text-textSecondary"
                                }`}
                            >
                              {tab.badge}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-textSecondary line-clamp-2">
                            {tab.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment Gateway Compliance Badge Card */}
                  <div className="mt-2 rounded-xl border border-border/40 bg-surface/40 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-textPrimary">
                      <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>256-Bit SSL Encrypted</span>
                    </div>
                    <p className="mt-1 text-[10px] text-textMuted leading-relaxed">
                      Compliant with RBI digital payment directions, PCI-DSS Level 1 security, and international data standards.
                    </p>
                  </div>
                </div>

                {/* Right Reader Container */}
                <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-border/40 bg-surface/80 p-6 shadow-xl backdrop-blur-md md:p-8">
                  {loading ? (
                    <div className="flex flex-col gap-4 animate-pulse">
                      <div className="h-8 w-1/3 rounded bg-elevated/60" />
                      <div className="h-4 w-2/3 rounded bg-elevated/40" />
                      <hr className="my-4 border-border/20" />
                      <div className="space-y-3">
                        <div className="h-3 w-full rounded bg-elevated/30" />
                        <div className="h-3 w-5/6 rounded bg-elevated/30" />
                        <div className="h-3 w-4/5 rounded bg-elevated/30" />
                        <div className="h-3 w-full rounded bg-elevated/30" />
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-textPrimary">{error}</p>
                      <button
                        type="button"
                        onClick={() => fetchLegalDocument(activeTabId, selectedVersion)}
                        className="mt-4 rounded-input bg-primary px-4 py-2 text-xs font-bold text-background shadow transition-all hover:bg-primaryHover"
                      >
                        Retry Loading
                      </button>
                    </div>
                  ) : docContent ? (
                    <article className="prose-chat text-sm leading-relaxed text-textSecondary max-w-none">
                      {/* Document Version & Metadata Bar */}
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-3 text-xs text-textMuted">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Interactive Version Selector Dropdown */}
                          <div className="relative" ref={dropdownRef}>
                            {docContent.versions && docContent.versions.length > 1 ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-elevated px-2.5 py-1 text-[11px] font-bold text-textPrimary hover:border-primary/50 transition-colors"
                                >
                                  <span className="text-primary font-mono">{docContent.version || "Current"}</span>
                                  {docContent.is_current !== false ? (
                                    <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] text-primary uppercase">Latest</span>
                                  ) : (
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] text-amber-300 uppercase">Archived</span>
                                  )}
                                  <svg className={`h-3.5 w-3.5 text-textMuted transition-transform ${versionDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>

                                {versionDropdownOpen && (
                                  <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-border/60 bg-[#12151e] p-2 shadow-2xl backdrop-blur-xl">
                                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                                      Version History
                                    </p>
                                    <div className="mt-1 flex flex-col gap-1">
                                      {docContent.versions.map((v) => {
                                        const isSelected = v.version.toLowerCase() === (docContent.version || "").toLowerCase();
                                        return (
                                          <button
                                            key={v.version}
                                            type="button"
                                            onClick={() => handleSelectVersion(v.is_current ? "" : v.version)}
                                            className={`flex flex-col rounded-lg p-2 text-left transition-all ${isSelected
                                                ? "bg-primary/15 border border-primary/40 text-textPrimary"
                                                : "hover:bg-surface/80 text-textSecondary"
                                              }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className={`font-mono text-xs font-bold ${isSelected ? "text-primary" : "text-textPrimary"}`}>
                                                {v.version}
                                              </span>
                                              <span className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 ${v.is_current ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-textMuted"
                                                }`}>
                                                {v.is_current ? "Current" : "Archived"}
                                              </span>
                                            </div>
                                            <span className="mt-0.5 text-[10px] text-textMuted">{v.date}</span>
                                            {v.summary && (
                                              <p className="mt-1 text-[10px] leading-tight text-textSecondary line-clamp-2">
                                                {v.summary}
                                              </p>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : docContent.version ? (
                              <span className="rounded bg-elevated px-2 py-0.5 font-mono font-bold text-primary text-[10px]">
                                {docContent.version}
                              </span>
                            ) : null}
                          </div>

                          {docContent.last_updated && (
                            <span className="text-[11px]">Updated: {docContent.last_updated}</span>
                          )}
                          {docContent.effective_date && (
                            <span className="text-[11px] text-textMuted/70">• Effective: {docContent.effective_date}</span>
                          )}
                        </div>

                        {docContent.versions && docContent.versions.length > 1 && (
                          <span className="text-[10px] text-textMuted">
                            {docContent.versions.length} versions available
                          </span>
                        )}
                      </div>

                      {/* Archived Version Warning Banner */}
                      {docContent.is_current === false && (
                        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-base shrink-0">⚠️</span>
                              <div>
                                <p className="font-bold text-amber-300">
                                  Archived Document Version ({docContent.version})
                                </p>
                                <p className="mt-0.5 text-[11px] text-amber-200/80">
                                  You are viewing an older historical version published on {docContent.last_updated || docContent.effective_date}. It may not reflect current operational or billing terms.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectVersion("")}
                              className="shrink-0 rounded-input bg-amber-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-300 transition-colors shadow"
                            >
                              View Latest Version
                            </button>
                          </div>
                        </div>
                      )}

                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="mb-3 font-headline text-2xl font-black tracking-tight text-textPrimary md:text-3xl">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mt-8 mb-3 border-b border-border/30 pb-2 font-headline text-lg font-bold text-textPrimary">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-primary">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-4 leading-relaxed text-textSecondary text-[13px] sm:text-sm">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-4 ml-5 list-disc space-y-1.5 marker:text-primary">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-4 ml-5 list-decimal space-y-1.5 marker:text-primary">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li className="pl-1 text-textSecondary">{children}</li>,
                          table: ({ children }) => (
                            <div className="my-5 overflow-x-auto rounded-xl border border-border/40 bg-elevated/30">
                              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="border-b border-border/60 bg-elevated/60 text-textPrimary">
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[11px] text-textPrimary">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border-b border-border/20 px-4 py-2.5 text-textSecondary">
                              {children}
                            </td>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold text-textPrimary">{children}</strong>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target={href?.startsWith("http") ? "_blank" : undefined}
                              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                              className="font-medium text-primary underline underline-offset-2 hover:text-primaryHover"
                            >
                              {children}
                            </a>
                          ),
                          hr: () => <hr className="my-6 border-border/30" />,
                          blockquote: ({ children }) => (
                            <blockquote className="my-4 rounded-r-lg border-l-4 border-primary bg-primary/5 py-2 pl-4 italic text-textPrimary">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {docContent.content_markdown}
                      </ReactMarkdown>
                    </article>
                  ) : null}
                </div>
              </div>

              {/* Global Legal & Compliance Footer */}
              <footer className="mt-12 border-t border-border/30 pt-8 pb-12 text-center text-xs text-textMuted">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
                  {LEGAL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`hover:text-primary transition-colors ${tab.id === activeTabId ? "text-primary font-bold" : ""
                        }`}
                    >
                      {tab.shortTitle}
                    </button>
                  ))}
                  <Link to="/docs" className="hover:text-primary transition-colors">
                    Developer Docs
                  </Link>
                </div>
                <p className="mt-4 text-[11px] text-textMuted/70">
                  © 2026 Neural Architect All rights reserved. Designed for reliable, high-assurance neural computing.
                </p>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
