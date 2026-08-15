import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { 
  getDocumentsList, 
  getDocumentDetails, 
  type DocMetadata, 
  type DocDetail 
} from "../api/api";
import PageTransition from "../components/PageTransition";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { useAuth } from "../context/AuthContext";

// Policy documents are now served in their dedicated /legal & /terms pages
const LEGAL_POLICY_SLUGS = new Set([
  "terms-and-conditions",
  "terms",
  "privacy-policy",
  "privacy",
  "refund-policy",
  "refunds",
  "pricing",
  "pricing-policy",
  "contact-us",
  "contact",
  "delivery-policy",
  "shipping-policy",
]);

export default function Documentation() {
  useDocumentSEO({
    title: "Documentation",
    description: "Read technical guides for configuring API keys, managing credits, and integrating Model Context Protocol (MCP) tools.",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read initial query params from URL
  const queryDocId = new URLSearchParams(location.search).get("id") || "";
  const queryVersion = new URLSearchParams(location.search).get("v") || "";

  const [docs, setDocs] = useState<DocMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(queryDocId);
  const [selectedVersion, setSelectedVersion] = useState<string>(queryVersion);
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

  // Load documents list on mount
  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoadingList(true);
        const data = await getDocumentsList();
        // Filter out legal/compliance docs to avoid duplication with the dedicated Legal Hub
        const technicalDocs = data.filter((d) => !LEGAL_POLICY_SLUGS.has(d.id.toLowerCase()));
        setDocs(technicalDocs);
        if (technicalDocs.length > 0) {
          const defaultId = queryDocId && technicalDocs.some(d => d.id === queryDocId)
            ? queryDocId
            : technicalDocs[0].id;
          setSelectedDocId(defaultId);
        }
      } catch (err) {
        console.error("Failed to load documents list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, []);

  // Load document details when selected ID or version changes
  useEffect(() => {
    if (!selectedDocId) return;

    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const data = await getDocumentDetails(selectedDocId, selectedVersion || undefined);
        setSelectedDoc(data);
      } catch (err) {
        console.error(`Failed to load document details for ${selectedDocId}`, err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedDocId, selectedVersion]);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    setSelectedVersion("");
    navigate(`/docs?id=${encodeURIComponent(docId)}`);
  };

  const handleSelectVersion = (versionStr: string) => {
    setSelectedVersion(versionStr);
    setVersionDropdownOpen(false);
    if (versionStr) {
      navigate(`/docs?id=${encodeURIComponent(selectedDocId)}&v=${encodeURIComponent(versionStr)}`);
    } else {
      navigate(`/docs?id=${encodeURIComponent(selectedDocId)}`);
    }
  };

  const handleCopyCode = (codeStr: string, index: number) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(`${selectedDocId}-${index}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="settings" isAuthenticated={isAuthenticated} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar hideIncognito={true} />
          
          <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full flex flex-col min-h-0">
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Developer & User Documentation
              </div>
              <h1 className="text-2xl font-bold text-textPrimary">Guides & Manuals</h1>
              <p className="mt-1 text-sm text-textSecondary">
                Technical references for environment setup, BYOK API credentials, billing mechanisms, and Model Context Protocol (MCP) integrations.
              </p>
            </div>

            {/* Split layout */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0 items-start overflow-y-auto md:overflow-visible">
              
              {/* Left sidebar index selector */}
              <div className="md:col-span-1 flex flex-col gap-3 md:sticky md:top-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-textMuted px-1">
                  Guides Index
                </p>
                {loadingList ? (
                  // Skeletons
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div 
                      key={`doc-skeleton-${idx}`}
                      className="h-16 w-full rounded-card bg-surface/30 border border-border/10 animate-pulse p-3 flex flex-col gap-1.5"
                    >
                      <div className="h-3.5 w-2/3 bg-elevated/60 rounded" />
                      <div className="h-2.5 w-5/6 bg-elevated/40 rounded" />
                    </div>
                  ))
                ) : docs.length === 0 ? (
                  <p className="text-xs text-textMuted italic p-1">No guides available.</p>
                ) : (
                  docs.map((doc) => {
                    const isSelected = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc.id)}
                        className={`text-left rounded-card p-3.5 transition-all border duration-200 ${
                          isSelected 
                            ? "bg-primary/5 border-primary/50 text-textPrimary shadow-[0_0_15px_rgba(217,255,0,0.03)] scale-[1.01]" 
                            : "bg-surface border-border/30 text-textSecondary hover:bg-surface/80 hover:text-textPrimary hover:border-border/60"
                        }`}
                      >
                        <p className={`text-sm font-bold ${isSelected ? "text-primary font-headline" : "text-textPrimary"}`}>{doc.title}</p>
                        <p className="text-[11px] text-textSecondary mt-1 leading-relaxed line-clamp-2">{doc.description}</p>
                      </button>
                    );
                  })
                )}

                {/* Direct link to Legal & Compliance Hub */}
                <div className="mt-3 rounded-xl border border-border/40 bg-surface/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-textPrimary">
                    <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Compliance & Legal</span>
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted leading-relaxed">
                    Review terms, privacy, refund, and fulfillment policies.
                  </p>
                  <Link
                    to="/terms"
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>Go to Compliance Hub</span>
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>

              {/* Right main reader window */}
              <div className="md:col-span-3 flex flex-col min-h-0 bg-surface border border-border/40 rounded-card p-6 md:p-8 shadow-none overflow-y-auto">
                {loadingDetail ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    <div className="h-7 w-1/3 bg-elevated/50 rounded" />
                    <div className="h-3 w-1/2 bg-elevated/30 rounded mb-4" />
                    <hr className="border-border/30" />
                    <div className="space-y-2 mt-4">
                      <div className="h-3 w-full bg-elevated/20 rounded" />
                      <div className="h-3 w-5/6 bg-elevated/20 rounded" />
                      <div className="h-3 w-4/5 bg-elevated/20 rounded" />
                      <div className="h-3 w-full bg-elevated/20 rounded" />
                    </div>
                  </div>
                ) : selectedDoc ? (
                  <div className="prose-chat text-textSecondary max-w-none text-sm leading-relaxed">
                    {/* Metadata Header Bar with Interactive Version Selector */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-3 text-xs text-textMuted">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Interactive Version Selector Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                          {selectedDoc.versions && selectedDoc.versions.length > 1 ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-elevated px-2.5 py-1 text-[11px] font-bold text-textPrimary hover:border-primary/50 transition-colors"
                              >
                                <span className="text-primary font-mono">{selectedDoc.version || "Current"}</span>
                                {selectedDoc.is_current !== false ? (
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
                                    {selectedDoc.versions.map((v) => {
                                      const isSelected = v.version.toLowerCase() === (selectedDoc.version || "").toLowerCase();
                                      return (
                                        <button
                                          key={v.version}
                                          type="button"
                                          onClick={() => handleSelectVersion(v.is_current ? "" : v.version)}
                                          className={`flex flex-col rounded-lg p-2 text-left transition-all ${
                                            isSelected
                                              ? "bg-primary/15 border border-primary/40 text-textPrimary"
                                              : "hover:bg-surface/80 text-textSecondary"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className={`font-mono text-xs font-bold ${isSelected ? "text-primary" : "text-textPrimary"}`}>
                                              {v.version}
                                            </span>
                                            <span className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 ${
                                              v.is_current ? "bg-emerald-500/10 text-emerald-400" : "bg-elevated text-textMuted"
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
                          ) : selectedDoc.version ? (
                            <span className="rounded bg-elevated px-2 py-0.5 font-mono font-bold text-primary text-[10px]">
                              {selectedDoc.version}
                            </span>
                          ) : null}
                        </div>

                        {selectedDoc.last_updated && (
                          <span className="text-[11px]">Updated: {selectedDoc.last_updated}</span>
                        )}
                        {selectedDoc.effective_date && (
                          <span className="text-[11px] text-textMuted/70">• Effective: {selectedDoc.effective_date}</span>
                        )}
                      </div>

                      {selectedDoc.versions && selectedDoc.versions.length > 1 && (
                        <span className="text-[10px] text-textMuted">
                          {selectedDoc.versions.length} versions available
                        </span>
                      )}
                    </div>

                    {/* Archived Version Warning Banner */}
                    {selectedDoc.is_current === false && (
                      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="text-base shrink-0">⚠️</span>
                            <div>
                              <p className="font-bold text-amber-300">
                                Archived Guide Version ({selectedDoc.version})
                              </p>
                              <p className="mt-0.5 text-[11px] text-amber-200/80">
                                You are viewing an older historical edition published on {selectedDoc.last_updated || selectedDoc.effective_date}.
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
                          <h1 className="mt-2 mb-4 font-headline text-2xl font-black tracking-tight text-textPrimary md:text-3xl border-b border-border/20 pb-3">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mt-7 mb-3 font-headline text-lg font-bold text-textPrimary border-b border-border/10 pb-1.5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mt-5 mb-2 text-sm font-bold text-primary uppercase tracking-wide">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => <p className="mb-3.5 leading-relaxed text-textSecondary text-[13px] sm:text-sm">{children}</p>,
                        code: ({ className, children, ...props }) => {
                          const isBlock = className?.includes("hljs") || className?.includes("language-");
                          const codeText = String(children).replace(/\n$/, "");
                          
                          if (isBlock) {
                            const randIdx = Math.floor(Math.random() * 10000);
                            const copyId = `${selectedDocId}-${randIdx}`;
                            
                            return (
                              <div className="relative group/code my-4 overflow-hidden rounded-input border border-border/30">
                                <code className={`${className || ""} block p-4 bg-[#0d0d0e] text-[12.5px] overflow-x-auto`} {...props}>
                                  {children}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(codeText, randIdx)}
                                  className="absolute top-3 right-3 p-1.5 rounded bg-surface/80 hover:bg-elevated border border-border/30 text-textMuted hover:text-textPrimary transition-all text-[9px] font-headline font-bold uppercase tracking-wider opacity-0 group-hover/code:opacity-100 focus:opacity-100"
                                >
                                  {copiedCode === copyId ? "Copied" : "Copy"}
                                </button>
                              </div>
                            );
                          }
                          return <code className="rounded bg-elevated px-1.5 py-0.5 text-[12px] font-bold text-primary" {...props}>{children}</code>;
                        },
                        pre: ({ children }) => <>{children}</>,
                        ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1.5 marker:text-primary">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1.5 marker:text-primary">{children}</ol>,
                        li: ({ children }) => <li className="pl-1 leading-relaxed text-textSecondary">{children}</li>,
                        blockquote: ({ children }) => (
                          <blockquote className="my-4 rounded-r-lg border-l-4 border-primary bg-primary/5 py-2 pl-4 italic text-textPrimary">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="my-5 overflow-x-auto rounded-xl border border-border/40 bg-elevated/30">
                            <table className="w-full border-collapse text-left text-xs sm:text-sm">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="border-b border-border/60 bg-elevated/60 text-textPrimary">{children}</thead>,
                        th: ({ children }) => <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-textPrimary text-[10px]">{children}</th>,
                        td: ({ children }) => <td className="border-b border-border/20 px-4 py-2.5 text-textSecondary">{children}</td>,
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
                        strong: ({ children }) => <strong className="font-bold text-textPrimary">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                      }}
                    >
                      {selectedDoc.content_markdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-textMuted">Select a guide to read documentation.</p>
                  </div>
                )}
              </div>

            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
