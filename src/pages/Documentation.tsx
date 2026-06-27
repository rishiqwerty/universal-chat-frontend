import { useState, useEffect } from "react";
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

export default function Documentation() {
  useDocumentSEO({
    title: "Documentation",
    description: "Read setup guides, api configurations, credits billing guidelines, and Model Context Protocol instructions.",
  });

  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const [docs, setDocs] = useState<DocMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load documents list on mount
  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoadingList(true);
        const data = await getDocumentsList();
        setDocs(data);
        if (data.length > 0) {
          setSelectedDocId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load documents list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, []);

  // Load document details when selected ID changes
  useEffect(() => {
    if (!selectedDocId) return;

    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const data = await getDocumentDetails(selectedDocId);
        setSelectedDoc(data);
      } catch (err) {
        console.error(`Failed to load document details for ${selectedDocId}`, err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedDocId]);

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
              <h1 className="text-2xl font-bold text-textPrimary">Documentation</h1>
              <p className="mt-1 text-sm text-textSecondary">
                Guides and references for configuring your environment, managing billing credits, and integrating MCP tools.
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
                  <p className="text-xs text-textMuted italic p-1">No documents found.</p>
                ) : (
                  docs.map((doc) => {
                    const isSelected = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`text-left rounded-card p-3.5 transition-all border duration-300 ${
                          isSelected 
                            ? "bg-primary/5 border-primary/50 text-textPrimary shadow-[0_0_15px_rgba(217,255,0,0.03)] scale-[1.02]" 
                            : "bg-surface border-border/30 text-textSecondary hover:bg-surface/80 hover:text-textPrimary hover:border-border/60 hover:scale-[1.01]"
                        }`}
                      >
                        <p className={`text-sm font-bold ${isSelected ? "text-primary font-headline" : "text-textPrimary"}`}>{doc.title}</p>
                        <p className="text-[11px] text-textSecondary mt-1 leading-relaxed line-clamp-2">{doc.description}</p>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right main reader window */}
              <div className="md:col-span-3 flex flex-col min-h-0 bg-surface border border-border/40 rounded-card p-6 shadow-none overflow-y-auto">
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
                    <div className="mb-4">
                      <h2 className="text-xl font-headline font-black text-textPrimary">{selectedDoc.title}</h2>
                      <p className="text-xs text-textMuted mt-1">{selectedDoc.description}</p>
                    </div>
                    <hr className="border-border/20 mb-6" />
                    
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ children }) => <h1 className="mt-6 mb-3 text-lg font-black text-textPrimary uppercase tracking-wide border-b border-border/10 pb-1 font-headline">{children}</h1>,
                        h2: ({ children }) => <h2 className="mt-5 mb-2.5 text-base font-bold text-textPrimary font-headline">{children}</h2>,
                        h3: ({ children }) => <h3 className="mt-4 mb-2 text-sm font-bold text-textPrimary">{children}</h3>,
                        p: ({ children }) => <p className="mb-3.5 leading-relaxed text-textSecondary">{children}</p>,
                        code: ({ className, children, ...props }) => {
                          const isBlock = className?.includes("hljs") || className?.includes("language-");
                          const codeText = String(children).replace(/\n$/, "");
                          
                          if (isBlock) {
                            // Find index of this block for copy mapping
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
                        ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-1.5 marker:text-textMuted">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-1.5 marker:text-textMuted">{children}</ol>,
                        li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                        blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-primary/50 pl-4 italic text-textMuted bg-elevated/10 py-1 rounded-r">{children}</blockquote>,
                        table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-xs bg-elevated/10 rounded-input overflow-hidden">{children}</table></div>,
                        thead: ({ children }) => <thead className="border-b border-border/40 text-left text-textPrimary bg-elevated/20">{children}</thead>,
                        th: ({ children }) => <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-textSecondary text-[10px]">{children}</th>,
                        td: ({ children }) => <td className="border-b border-border/10 px-4 py-2.5">{children}</td>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primaryHover">{children}</a>,
                        hr: () => <hr className="my-6 border-border/20" />,
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
