import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Listen for console logs posted from iframe sandbox with throttling & buffer limits
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

  // Reset logs when iframe restarts or modal opens
  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      setIframeKey((k) => k + 1);
    }
  }, [isOpen, codeHtml]);

  const [viewport, setViewport] = useState<{
    height: number;
    width: number;
    offsetTop: number;
    offsetLeft: number;
  }>({
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    offsetTop: 0,
    offsetLeft: 0,
  });

  // Track visual viewport dynamically and anchor modal to visible area on mobile keyboards
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const updateViewport = () => {
      if (window.visualViewport) {
        setViewport({
          height: window.visualViewport.height,
          width: window.visualViewport.width,
          offsetTop: window.visualViewport.offsetTop,
          offsetLeft: window.visualViewport.offsetLeft,
        });
      } else {
        setViewport({
          height: window.innerHeight,
          width: window.innerWidth,
          offsetTop: 0,
          offsetLeft: 0,
        });
      }
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("scroll", updateViewport);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("scroll", updateViewport);
    };
  }, [isOpen]);

  const handleRefresh = () => {
    setLogs([]);
    setIframeKey((k) => k + 1);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Prepare full html with console interceptor if not present
  const preparedHtml = codeHtml.includes("CONSOLE_LOG")
    ? codeHtml
    : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
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

  return (
    <AnimatePresence>
      <div 
        className="fixed z-50 flex items-start sm:items-center justify-center bg-black/70 p-0 sm:p-3 md:p-6 backdrop-blur-md overflow-hidden"
        style={{
          top: `${viewport.offsetTop}px`,
          left: `${viewport.offsetLeft}px`,
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          maxHeight: `${viewport.height}px`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          style={{
            maxHeight: `${viewport.height}px`,
            height: viewport.height < 650 ? `${viewport.height}px` : "85vh",
          }}
          className="flex h-full sm:h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-border/40 bg-sidebar shadow-2xl ring-0 sm:ring-1 sm:ring-white/10"
        >
          {/* Header (Sticky at top, with frosted glassmorphism & drop shadow blend) */}
          <div className="flex shrink-0 sticky top-0 z-30 flex-col bg-surface/90 backdrop-blur-md shadow-lg shadow-black/25 transition-all">
            {/* Top Row: Title + Status + Action Buttons (Always fits 100% width on any screen) */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5">
              {/* Left Title & Badge */}
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      activeTab === "preview" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
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
                      activeTab === "console" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
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
                      activeTab === "code" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
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
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 bg-elevated/40 text-textMuted transition-colors hover:bg-elevated hover:text-textPrimary"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                    <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </button>

                {/* Close Modal (Always visible and touch-friendly on top-right) */}
                <button
                  type="button"
                  onClick={onClose}
                  title="Close Modal"
                  aria-label="Close Modal"
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/60 bg-elevated/60 text-textSecondary transition-colors hover:bg-red-500/20 hover:text-red-400 active:scale-95 shadow-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Sub-Header: Touch-Friendly Segmented Tab Bar */}
            <div className="flex sm:hidden items-center justify-between px-2.5 py-1.5 bg-background/50">
              <div className="flex w-full items-center justify-between gap-1 rounded-lg border border-border/40 bg-elevated/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                    activeTab === "preview" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
                  }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("console")}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                    activeTab === "console" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
                  }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5" />
                  </svg>
                  Console
                  {logs.length > 0 && (
                    <span className={`ml-0.5 rounded-full px-1 text-[9px] font-bold ${
                      activeTab === "console" ? "bg-background text-primary" : "bg-primary/20 text-primary"
                    }`}>
                      {logs.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                    activeTab === "code" ? "bg-primary text-background shadow-sm" : "text-textMuted hover:text-textPrimary"
                  }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Code
                </button>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="relative flex-1 overflow-hidden bg-[#0d0d0e]">
            {/* Live Preview Tab */}
            <div className={`h-full w-full ${activeTab === "preview" ? "block" : "hidden"}`}>
              <iframe
                key={iframeKey}
                ref={iframeRef}
                title="Live Code Preview"
                srcDoc={preparedHtml}
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className="h-full w-full border-none bg-white"
              />
            </div>

            {/* Console Output Tab */}
            {activeTab === "console" && (
              <div className="h-full overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
                <div className="mb-3 flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-textMuted">Developer Console Output ({logs.length} logs)</span>
                  <button
                    onClick={() => setLogs([])}
                    className="text-[11px] text-textMuted hover:text-primary underline"
                  >
                    Clear Console
                  </button>
                </div>
                {logs.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-textMuted">
                    <svg className="mb-2 h-8 w-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <p>No console output emitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((l, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 rounded-md px-3 py-2 border ${
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
              <div className="relative h-full overflow-y-auto p-4 custom-scrollbar">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute right-6 top-6 flex items-center gap-1.5 rounded-md bg-elevated px-3 py-1.5 text-xs text-textSecondary hover:bg-elevated/80 hover:text-textPrimary"
                >
                  {copied ? "Copied!" : "Copy Code"}
                </button>
                <pre className="font-mono text-xs leading-relaxed text-textPrimary">
                  <code>{preparedHtml}</code>
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
