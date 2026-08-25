import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

type ConsoleLog = {
  type: "log" | "error" | "warn";
  message: string;
  time: string;
};

type CodeRunnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  codeHtml: string;
  langSummary?: string;
};

export default function CodeRunnerModal({ isOpen, onClose, codeHtml, langSummary }: CodeRunnerModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "console">("preview");
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let logBuffer: ConsoleLog[] = [];
    let flushTimer: any = null;

    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "CONSOLE_LOG") {
        const newLog: ConsoleLog = {
          type: event.data.logType || "log",
          message: event.data.message || "",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        logBuffer.push(newLog);

        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            if (logBuffer.length > 0) {
              const toAppend = [...logBuffer];
              logBuffer = [];
              setLogs((prev) => [...prev, ...toAppend].slice(-500));
            }
            flushTimer = null;
          }, 50);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      setIframeKey((k) => k + 1);
    }
  }, [isOpen, codeHtml]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleRefresh = () => {
    setLogs([]);
    setIframeKey((k) => k + 1);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(preparedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if code is a complete HTML document
  const isFullHtml = /<!DOCTYPE\s+html|<html[\s>]/i.test(codeHtml);

  // Prepare HTML document with auto-injected console hook
  const preparedHtml = isFullHtml
    ? codeHtml.replace(
        /<head([^>]*)>/i,
        `<head$1>
        <script>
          (function() {
            const _log = console.log;
            const _error = console.error;
            const _warn = console.warn;
            function send(type, args) {
              try {
                window.parent.postMessage({
                  type: 'CONSOLE_LOG',
                  logType: type,
                  message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
                }, '*');
              } catch(e) {}
            }
            console.log = function(...args) { send('log', args); _log.apply(console, args); };
            console.error = function(...args) { send('error', args); _error.apply(console, args); };
            console.warn = function(...args) { send('warn', args); _warn.apply(console, args); };
          })();
        </script>`
      )
    : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0d0d0e;
      color: #f3f4f6;
    }
  </style>
</head>
<body>
  ${codeHtml}
  <script>
    (function() {
      const _log = console.log;
      const _error = console.error;
      const _warn = console.warn;
      function send(type, args) {
        try {
          window.parent.postMessage({
            type: 'CONSOLE_LOG',
            logType: type,
            message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
          }, '*');
        } catch(e) {}
      }
      console.log = function(...args) { send('log', args); _log.apply(console, args); };
      console.error = function(...args) { send('error', args); _error.apply(console, args); };
      console.warn = function(...args) { send('warn', args); _warn.apply(console, args); };
    })();
  </script>
</body>
</html>`;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop click dismiss on desktop */}
          <div 
            onClick={onClose} 
            className="absolute inset-0 z-0 hidden sm:block" 
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 flex h-full sm:h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-border/50 bg-sidebar shadow-2xl ring-0 sm:ring-1 sm:ring-white/10 text-left"
          >
            {/* Header with Safe Area Inset Support on Mobile */}
            <div className="flex shrink-0 sticky top-0 z-30 flex-col bg-surface/95 backdrop-blur-xl border-b border-border/40 shadow-md shadow-black/30 transition-all pt-[max(env(safe-area-inset-top,0px),8px)] sm:pt-2.5 pb-2 px-3 sm:px-4">
              {/* Top Row: Title + Status + Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                {/* Left Title & Badge */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div className="truncate flex items-center gap-1.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-textPrimary truncate">Code Sandbox</h3>
                    {langSummary && (
                      <span className="shrink-0 rounded-md bg-primary/15 px-1.5 sm:px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary ring-1 ring-primary/30">
                        {langSummary.replace(" (Pyodide Wasm)", "")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Controls: Desktop Tabs + Refresh & Close Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Desktop Tabs (Hidden on Mobile) */}
                  <div className="hidden sm:flex items-center rounded-lg border border-border/40 bg-elevated/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        activeTab === "preview" ? "bg-primary text-background shadow-sm font-bold" : "text-textMuted hover:text-textPrimary"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("console")}
                      className={`relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        activeTab === "console" ? "bg-primary text-background shadow-sm font-bold" : "text-textMuted hover:text-textPrimary"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 17 10 11 4 5" />
                      </svg>
                      Console
                      {logs.length > 0 && (
                        <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                          activeTab === "console" ? "bg-background text-primary" : "bg-primary/20 text-primary"
                        }`}>
                          {logs.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("code")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        activeTab === "code" ? "bg-primary text-background shadow-sm font-bold" : "text-textMuted hover:text-textPrimary"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      Source Code
                    </button>
                  </div>

                  {/* Restart / Refresh button */}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    title="Restart Execution"
                    aria-label="Restart Execution"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-elevated/60 text-textSecondary transition-all hover:bg-elevated hover:text-textPrimary active:scale-95"
                  >
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                      <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                  </button>

                  {/* Close Modal (Always visible, prominent, and touch-friendly) */}
                  <button
                    type="button"
                    onClick={onClose}
                    title="Close Sandbox"
                    aria-label="Close Sandbox"
                    className="flex h-8 w-8 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/60 bg-elevated text-textPrimary transition-all hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 active:scale-95 shadow-sm"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile Sub-Header: Touch-Friendly Segmented Tab Bar */}
              <div className="flex sm:hidden items-center justify-between mt-2 pt-1">
                <div className="flex w-full items-center justify-between gap-1 rounded-xl border border-border/40 bg-elevated/50 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      activeTab === "preview" ? "bg-primary text-background shadow-md" : "text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("console")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      activeTab === "console" ? "bg-primary text-background shadow-md" : "text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                    </svg>
                    Console
                    {logs.length > 0 && (
                      <span className={`ml-0.5 rounded-full px-1.5 text-[9px] font-black ${
                        activeTab === "console" ? "bg-background text-primary" : "bg-primary/20 text-primary"
                      }`}>
                        {logs.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      activeTab === "code" ? "bg-primary text-background shadow-md" : "text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    Code
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-background">
              {/* Preview Tab (Live Iframe Sandbox) */}
              <div className={`h-full w-full ${activeTab === "preview" ? "block" : "hidden"}`}>
                <iframe
                  ref={iframeRef}
                  key={iframeKey}
                  title="code-sandbox-preview"
                  srcDoc={preparedHtml}
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="h-full w-full border-none bg-[#0d0d0e]"
                />
              </div>

              {/* Console Tab */}
              {activeTab === "console" && (
                <div className="h-full overflow-y-auto p-3 sm:p-4 font-mono text-xs custom-scrollbar bg-[#0a0a0c]">
                  <div className="flex items-center justify-between mb-3 border-b border-border/20 pb-2">
                    <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                      Execution Logs ({logs.length})
                    </span>
                    {logs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLogs([])}
                        className="text-[10px] text-textMuted hover:text-red-400 transition-colors uppercase tracking-wider font-semibold"
                      >
                        Clear Console
                      </button>
                    )}
                  </div>

                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-textMuted text-xs gap-1.5">
                      <svg className="h-6 w-6 opacity-40 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                      <span>No console outputs yet.</span>
                      <span className="text-[10px] opacity-60">Output from console.log, warn, and error will appear here.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {logs.map((l, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-2 rounded-lg p-2 border ${
                            l.type === "error"
                              ? "bg-red-500/10 border-red-500/30 text-red-300"
                              : l.type === "warn"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-surface/50 border-border/20 text-textPrimary"
                          }`}
                        >
                          <span className="shrink-0 text-[10px] text-textMuted">{l.time}</span>
                          <span className="font-bold uppercase tracking-wider text-[10px] shrink-0 opacity-70">[{l.type}]</span>
                          <pre className="whitespace-pre-wrap break-all font-mono leading-relaxed">{l.message}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Source Code Tab */}
              {activeTab === "code" && (
                <div className="relative h-full overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-[#0a0a0c]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Source Markup</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-textSecondary hover:bg-elevated/80 hover:text-textPrimary transition-all active:scale-95"
                    >
                      {copied ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                  <pre className="font-mono text-xs leading-relaxed text-textPrimary bg-surface/30 p-3 rounded-xl border border-border/20 overflow-x-auto">
                    <code>{preparedHtml}</code>
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
