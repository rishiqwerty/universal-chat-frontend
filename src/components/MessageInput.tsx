import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProviderModels, type OpenRouterModel, searchOpenRouterModels } from "../api/api";
import PremiumModelModal from "./PremiumModelModal";
import { isPremiumModel } from "../utils/modelUtils";

type MessageInputProps = {
  inputRef?: React.RefObject<MessageInputHandle> | React.MutableRefObject<MessageInputHandle | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isLoadingModels?: boolean;
  availableModels: ProviderModels[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onModelChange: (provider: string, model: string) => void;
  isTempMode?: boolean;
  showDisclaimer?: boolean;
};

export interface MessageInputHandle {
  openPicker: () => void;
  focus: () => void;
  triggerGlow: () => void;
}

export default function MessageInput({
  inputRef: outerRef,
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  isStreaming,
  isLoadingModels,
  availableModels,
  selectedProvider,
  selectedModel,
  onModelChange,
  isTempMode,
  showDisclaimer = false,
}: MessageInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [premiumModalData, setPremiumModalData] = useState<{ provider: string; model: string } | null>(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [searchResults, setSearchResults] = useState<OpenRouterModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isMultiline, setIsMultiline] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const lastModelWidthRef = useRef<number>(120);
  const singleLineWidthRef = useRef<number>(220);

  // Helper to measure text pixel width accurately matching textarea typography
  const measureTextWidth = (text: string): number => {
    if (typeof document === "undefined") return text.length * 8;
    const canvas = (measureTextWidth as any).canvas || ((measureTextWidth as any).canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    if (!ctx) return text.length * 8;
    if (textareaRef.current) {
      const computed = window.getComputedStyle(textareaRef.current);
      ctx.font = `${computed.fontSize || "14px"} ${computed.fontFamily || "system-ui, sans-serif"}`;
    } else {
      ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
    return ctx.measureText(text).width;
  };

  const isInputBlocked = disabled || isStreaming || (Boolean(isLoadingModels) && !isTempMode);

  // Auto-resize textarea height with smooth bidirectional expansion/reduction
  const updateHeightAndMultiline = useCallback((val: string) => {
    if (!textareaRef.current) {
      setIsMultiline(false);
      return;
    }

    if (!val || val.length === 0) {
      setIsMultiline(false);
      textareaRef.current.style.height = "26px";
      return;
    }

    const hasNewline = val.includes("\n");
    if (hasNewline) {
      setIsMultiline(true);
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 44), 180)}px`;
      return;
    }

    // Capture model selector width when mounted
    if (modelSelectorRef.current && modelSelectorRef.current.offsetWidth > 0) {
      lastModelWidthRef.current = modelSelectorRef.current.offsetWidth;
    }

    // Calculate dynamic available single-line width using live DOM measurements
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const modelW = isTempMode 
        ? 0 
        : (modelSelectorRef.current?.offsetWidth || lastModelWidthRef.current || (window.innerWidth < 640 ? 110 : 160));
      const sendW = 40;
      const paddingW = 24;
      singleLineWidthRef.current = Math.max(containerW - modelW - sendW - paddingW, 100);
    }

    const singleLineWidth = singleLineWidthRef.current;
    const textWidth = measureTextWidth(val);

    setIsMultiline((prev) => {
      let nextMultiline = prev;

      if (!prev) {
        // In single-line mode: expand if text exceeds single-line capacity, wraps, or has newline
        const scrollH = textareaRef.current ? textareaRef.current.scrollHeight : 0;
        if (hasNewline || scrollH > 28 || textWidth >= singleLineWidth - 6) {
          nextMultiline = true;
        }
      } else {
        // In multiline mode: collapse back to single line when text fits with small hysteresis buffer
        if (!hasNewline && textWidth < singleLineWidth - 18) {
          nextMultiline = false;
        }
      }

      // Update height accordingly
      if (textareaRef.current) {
        if (nextMultiline) {
          textareaRef.current.style.height = "auto";
          const sH = textareaRef.current.scrollHeight;
          textareaRef.current.style.height = `${Math.min(Math.max(sH, 44), 180)}px`;
        } else {
          textareaRef.current.style.height = "26px";
        }
      }

      return nextMultiline;
    });
  }, [isTempMode]);

  useEffect(() => {
    updateHeightAndMultiline(value);
  }, [value, selectedModel, isTempMode, updateHeightAndMultiline]);

  useEffect(() => {
    if (outerRef) {
      (outerRef as React.MutableRefObject<MessageInputHandle | null>).current = {
        openPicker: () => setShowPicker(true),
        focus: () => textareaRef.current?.focus(),
        triggerGlow: () => {
          setIsGlowing(true);
          setTimeout(() => setIsGlowing(false), 1200);
        }
      };
    }
  }, [outerRef]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Favorite models stored in localStorage
  const [favoriteModels, setFavoriteModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("favorite_chat_models");
      return stored ? JSON.parse(stored) : ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash", "deepseek-chat"];
    } catch {
      return ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash", "deepseek-chat"];
    }
  });

  const toggleFavoriteModel = useCallback((modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavoriteModels((prev) => {
      const exists = prev.includes(modelId);
      const next = exists ? prev.filter((id) => id !== modelId) : [...prev, modelId];
      try {
        localStorage.setItem("favorite_chat_models", JSON.stringify(next));
      } catch { }
      return next;
    });
  }, []);

  const currentProviderData = availableModels.find((p) => p.provider === selectedProvider);
  const isImageModel = currentProviderData?.image_models?.includes(selectedModel || "");
  const isOpenRouter = selectedProvider === "openrouter";
  const isOpenRouterBYOK = isOpenRouter && !currentProviderData?.is_free;

  // Debounced search for OpenRouter models
  const handleModelSearch = useCallback((query: string) => {
    setModelSearch(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!isOpenRouterBYOK || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchOpenRouterModels(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Model search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [isOpenRouterBYOK]);

  // Reset search when picker closes or provider changes
  useEffect(() => {
    if (!showPicker) {
      setModelSearch("");
      setSearchResults([]);
    }
  }, [showPicker, selectedProvider]);

  const renderModelSelector = (compact?: boolean) => {
    if (isTempMode) return null;
    if (isLoadingModels) {
      return (
        <div className="flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-textMuted bg-elevated/40 border border-border/30">
          <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="hidden sm:inline">Loading...</span>
        </div>
      );
    }
    const isCurrentModelPremium = isPremiumModel(selectedProvider, selectedModel || "", currentProviderData);

    return (
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        disabled={isStreaming || availableModels.length === 0}
        className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wide transition-all ${
          isImageModel 
            ? 'bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20' 
            : 'bg-elevated/60 text-textSecondary hover:bg-elevated hover:text-textPrimary border border-border/20'
        } disabled:opacity-30`}
        title="Select model"
      >
        {isImageModel ? (
          <svg className="h-3 w-3 animate-pulse text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary transition-colors shrink-0" />
        )}
        <span className={`${compact ? "max-w-[70px] sm:max-w-[130px]" : "max-w-[120px] sm:max-w-[180px]"} truncate`}>
          {selectedModel || "Model"}
        </span>
        {isCurrentModelPremium && (
          <span className="rounded bg-primary/20 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/30 shrink-0">
            PRO
          </span>
        )}
        <svg className={`h-2.5 w-2.5 shrink-0 text-textMuted transition-transform ${showPicker ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
    );
  };

  const renderSendButton = () => {
    if (isStreaming) {
      return (
        <button
          type="button"
          onClick={onStop}
          className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-3 text-xs font-bold uppercase tracking-wider text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500 hover:text-white"
          title="Stop generating AI response"
        >
          <span className="h-2 w-2 rounded-sm bg-current" />
          <span>Stop</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onSend}
        disabled={isInputBlocked || !value.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-background shadow-[0_0_12px_rgba(217,255,0,0.25)] transition-all hover:bg-primaryHover hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
        title="Send message (Enter)"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-1.5 relative">
        <motion.div
          ref={containerRef}
          animate={isGlowing ? { 
            boxShadow: [
              "0 0 0 0px rgba(217, 255, 0, 0)",
              "0 0 0 4px rgba(217, 255, 0, 0.4)",
              "0 0 0 0px rgba(217, 255, 0, 0)"
            ] 
          } : {}}
          transition={{ duration: 0.6, repeat: 1 }}
          className={`relative rounded-2xl border border-border/60 bg-surface/95 shadow-sm backdrop-blur-md transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40 focus-within:shadow-[0_0_20px_rgba(217,255,0,0.06)] ${
            isMultiline ? "flex flex-col gap-1.5 p-2 sm:p-2.5" : "flex items-center gap-1.5 p-1.5 sm:gap-2 sm:p-2"
          }`}
        >
          {/* When single-line: Model selector on the left */}
          {!isMultiline && (
            <div ref={modelSelectorRef} className="shrink-0 flex items-center">
              {renderModelSelector(true)}
            </div>
          )}

          {/* SINGLE PERSISTENT TEXTAREA: Never unmounts, preserving focus & cursor */}
          <div className={isMultiline ? "w-full px-1 pt-1" : "flex-1 min-w-0 flex items-center"}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                updateHeightAndMultiline(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (window.innerWidth >= 640) {
                    e.preventDefault();
                    if (!isInputBlocked && value.trim()) {
                      onSend();
                    }
                  }
                }
              }}
              placeholder={
                isLoadingModels && !isTempMode
                  ? "Loading models..."
                  : "Message Neural Architect..."
              }
              disabled={isInputBlocked}
              className={`max-h-[180px] min-h-[26px] w-full resize-none bg-transparent text-[14px] sm:text-sm text-textPrimary placeholder:text-textMuted focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                isMultiline
                  ? "overflow-y-auto custom-scrollbar leading-relaxed py-0.5"
                  : "overflow-hidden h-[26px] leading-snug px-1 py-0.5"
              }`}
            />
          </div>

          {/* When single-line: Send button on the right */}
          {!isMultiline && (
            <div className="shrink-0 flex items-center">
              {renderSendButton()}
            </div>
          )}

          {/* When multi-line: Bottom toolbar with Model on left and Send on right */}
          {isMultiline && (
            <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-1.5">
              <div className="flex items-center">
                {renderModelSelector(false)}
              </div>

              <div className="flex items-center">
                {renderSendButton()}
              </div>
            </div>
          )}
        </motion.div>

        {/* Picker Popover */}
        <AnimatePresence>
          {showPicker && (
            <>
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPicker(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              />

              <motion.div
                ref={pickerRef}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-2 bottom-14 sm:bottom-full sm:inset-x-auto sm:left-0 sm:right-auto sm:mb-2 z-50 w-auto sm:w-[380px] max-w-[calc(100vw-16px)] sm:max-w-md max-h-[75vh] sm:max-h-[80vh] overflow-hidden rounded-2xl border border-border/50 bg-sidebar shadow-2xl ring-1 ring-black/40 sm:rounded-card"
              >
                {/* Mobile Header Bar */}
                <div className="flex items-center justify-between border-b border-border/20 px-3.5 py-2 sm:hidden bg-elevated/40">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Select AI Model</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPicker(false)}
                    className="rounded-lg p-1 text-textMuted hover:bg-elevated hover:text-textPrimary transition-colors"
                    aria-label="Close picker"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="flex h-[280px] sm:h-[360px] max-h-[60vh]">
                  {/* Providers Column */}
                  <div className="w-[125px] sm:w-[135px] shrink-0 border-r border-border/20 bg-elevated/20 p-1.5 overflow-y-auto custom-scrollbar">
                    <p className="mb-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-textMuted">Providers</p>
                    <div className="space-y-1">
                      {(() => {
                        const sortedProviders = [...availableModels].sort((a, b) => {
                          const aFree = a.is_free || a.is_byok_configured;
                          const bFree = b.is_free || b.is_byok_configured;
                          if (aFree && !bFree) return -1;
                          if (!aFree && bFree) return 1;
                          return 0;
                        });

                        return sortedProviders.map((p) => {
                          const isPrem = !p.is_free && !p.is_byok_configured;
                          const isOnline = p.status !== "offline" && p.reachable !== false;
                          const isFast = p.speed_tier === "fast" || (!p.speed_tier && (p.latency_ms || 0) < 300);
                          const isModerate = p.speed_tier === "moderate" || (!p.speed_tier && (p.latency_ms || 0) >= 300 && (p.latency_ms || 0) < 800);
                          const isSelected = selectedProvider === p.provider;

                          return (
                            <button
                              key={p.provider}
                              type="button"
                              onClick={() => {
                                const defaultModel = p.text_models?.[0] || p.image_models?.[0] || "";
                                onModelChange(p.provider, defaultModel);
                              }}
                              className={`flex items-center justify-between w-full rounded-lg px-2 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] font-semibold transition-colors group ${
                                isSelected ? 'bg-primary text-background font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated'
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0 pr-1">
                                <span className="truncate">{p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}</span>
                                {isPrem && (
                                  <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
                                    isSelected ? 'bg-background/20 text-background' : 'bg-primary/10 text-primary border border-primary/20'
                                  }`}>
                                    PRO
                                  </span>
                                )}
                              </div>
                              {/* Speed & Reachability Badge */}
                              <div className="flex items-center gap-1 shrink-0">
                                {p.latency_ms ? (
                                  <span
                                    className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border ${
                                      isFast
                                        ? isSelected
                                          ? 'text-background bg-black/20 border-black/30'
                                          : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                        : isModerate
                                        ? isSelected
                                          ? 'text-background bg-black/20 border-black/30'
                                          : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                        : isSelected
                                        ? 'text-background bg-black/20 border-black/30'
                                        : 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                                    }`}
                                    title={`Latency: ${p.latency_ms}ms • Est: ~${p.est_tps || 60} tokens/sec`}
                                  >
                                    {p.latency_ms}ms
                                  </span>
                                ) : null}
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isOnline
                                      ? isFast
                                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                        : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                      : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                  }`}
                                />
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>                  {/* Models Column */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Universal Search Bar */}
                    <div className="shrink-0 border-b border-border/20 p-2">
                      <div className="relative">
                        <svg className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          value={modelSearch}
                          onChange={(e) => handleModelSearch(e.target.value)}
                          placeholder={isOpenRouterBYOK ? "Search 200+ models..." : `Filter ${selectedProvider ? selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1) : ''} models...`}
                          className="h-8 w-full rounded-lg border border-border/30 bg-elevated/50 pl-8 pr-7 text-xs sm:text-[11px] text-textPrimary placeholder:text-textMuted focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        {modelSearch && !isSearching && (
                          <button
                            type="button"
                            onClick={() => {
                              setModelSearch("");
                              setSearchResults([]);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        {isSearching && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                      {/* Search Results (when modelSearch query is present) */}
                      {modelSearch.trim() ? (
                        <div className="space-y-4">
                          {/* Remote OpenRouter Search Results */}
                          {isOpenRouterBYOK && searchResults.length > 0 && (
                            <div>
                              <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="11" cy="11" r="8" />
                                  <path d="m21 21-4.35-4.35" />
                                </svg>
                                OpenRouter Catalog
                              </div>
                              <div className="space-y-1">
                                {searchResults.map((m) => {
                                  const isPrem = isPremiumModel(selectedProvider, m.id);
                                  const isFav = favoriteModels.includes(m.id);
                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() => {
                                        if (isPrem) {
                                          setPremiumModalData({ provider: selectedProvider || "openrouter", model: m.id });
                                        } else {
                                          onModelChange(selectedProvider!, m.id);
                                          setShowPicker(false);
                                        }
                                      }}
                                      className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                        selectedModel === m.id ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{m.id}</span>
                                        {isPrem && (
                                          <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
                                            PRO
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                        {m.context_length && (
                                          <span className="text-[9px] text-textMuted">{Math.round(m.context_length / 1000)}k</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => toggleFavoriteModel(m.id, e)}
                                          className={`p-0.5 rounded transition-colors ${
                                            isFav ? 'text-primary' : 'text-textMuted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                                          }`}
                                          title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                        >
                                          <svg className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Local matching models */}
                          {(() => {
                            const query = modelSearch.toLowerCase();
                            const allLocal = [
                              ...(currentProviderData?.text_models || []),
                              ...(currentProviderData?.image_models || [])
                            ];
                            const filtered = allLocal.filter((m) => m.toLowerCase().includes(query));

                            if (filtered.length === 0 && (!isOpenRouterBYOK || searchResults.length === 0)) {
                              return (
                                <div className="p-4 text-center text-xs text-textMuted">
                                  No models matching "{modelSearch}"
                                </div>
                              );
                            }

                            if (filtered.length === 0) return null;

                            return (
                              <div>
                                <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">
                                  Matching {selectedProvider ? selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1) : ''} Models
                                </div>
                                <div className="space-y-1">
                                  {filtered.map((m) => {
                                    const isPrem = isPremiumModel(currentProviderData?.provider || selectedProvider, m, currentProviderData);
                                    const isFav = favoriteModels.includes(m);
                                    return (
                                      <div
                                        key={m}
                                        onClick={() => {
                                          if (isPrem) {
                                            setPremiumModalData({ provider: selectedProvider!, model: m });
                                          } else {
                                            onModelChange(selectedProvider!, m);
                                            setShowPicker(false);
                                          }
                                        }}
                                        className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                          selectedModel === m ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="truncate">{m}</span>
                                          {isPrem && (
                                            <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
                                              PRO
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleFavoriteModel(m, e)}
                                            className={`p-0.5 rounded transition-colors ${
                                              isFav ? 'text-primary' : 'text-textMuted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                                            }`}
                                            title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                          >
                                            <svg className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
                                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        /* Default Model List with Favorites, Standard, Premium & Image Models */
                        <>
                          {/* 1. Pinned / Favorites Section */}
                          {(() => {
                            const allProvModels = [
                              ...(currentProviderData?.text_models || []),
                              ...(currentProviderData?.image_models || [])
                            ];
                            const providerFavorites = favoriteModels.filter((m) => allProvModels.includes(m));

                            if (providerFavorites.length === 0) return null;

                            return (
                              <div className="mb-4">
                                <div className="mb-1.5 flex items-center justify-between px-2 py-1">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                                    <svg className="h-2.5 w-2.5 fill-primary text-primary" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    Pinned Favorites
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  {providerFavorites.map((m) => {
                                    const isPrem = isPremiumModel(currentProviderData?.provider || selectedProvider, m, currentProviderData);
                                    const isReachable =
                                      !currentProviderData?.reachable_models ||
                                      currentProviderData.reachable_models.length === 0 ||
                                      currentProviderData.reachable_models.includes(m);

                                    return (
                                      <div
                                        key={`fav-${m}`}
                                        onClick={() => {
                                          if (isPrem) {
                                            setPremiumModalData({ provider: selectedProvider!, model: m });
                                          } else {
                                            onModelChange(selectedProvider!, m);
                                            setShowPicker(false);
                                          }
                                        }}
                                        className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                          selectedModel === m ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="truncate">{m}</span>
                                          {isPrem && (
                                            <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
                                              PRO
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                          <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                              isReachable
                                                ? 'bg-emerald-400/90 shadow-[0_0_5px_rgba(52,211,153,0.7)]'
                                                : 'bg-rose-500/90 shadow-[0_0_5px_rgba(244,63,94,0.7)]'
                                            }`}
                                            title={isReachable ? 'Model active and operational' : 'Model currently unavailable'}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => toggleFavoriteModel(m, e)}
                                            className="p-0.5 rounded text-primary hover:scale-110 transition-transform"
                                            title="Unpin from favorites"
                                          >
                                            <svg className="h-3 w-3 fill-primary text-primary" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* 2. Standard Models Section */}
                          {(() => {
                            const textModels = currentProviderData?.text_models || [];
                            const standardModels = textModels.filter(
                              (m) => !isPremiumModel(currentProviderData?.provider || selectedProvider, m, currentProviderData)
                            );
                            const premiumModels = textModels.filter(
                              (m) => isPremiumModel(currentProviderData?.provider || selectedProvider, m, currentProviderData)
                            );

                            return (
                              <>
                                {standardModels.length > 0 && (
                                  <div className="mb-4">
                                    <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">
                                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                      </svg>
                                      {isOpenRouter ? "Featured Models" : "Standard Models"}
                                    </div>
                                    <div className="space-y-1">
                                      {standardModels.map((m) => {
                                        const isReachable =
                                          !currentProviderData?.reachable_models ||
                                          currentProviderData.reachable_models.length === 0 ||
                                          currentProviderData.reachable_models.includes(m);
                                        const isFav = favoriteModels.includes(m);
                                        return (
                                          <div
                                            key={m}
                                            onClick={() => {
                                              onModelChange(selectedProvider!, m);
                                              setShowPicker(false);
                                            }}
                                            className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                              selectedModel === m ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                            }`}
                                          >
                                            <span className="truncate">{m}</span>
                                            <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                              <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                  isReachable
                                                    ? 'bg-emerald-400/90 shadow-[0_0_5px_rgba(52,211,153,0.7)]'
                                                    : 'bg-rose-500/90 shadow-[0_0_5px_rgba(244,63,94,0.7)]'
                                                }`}
                                                title={isReachable ? 'Model active and operational' : 'Model currently unavailable'}
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => toggleFavoriteModel(m, e)}
                                                className={`p-0.5 rounded transition-colors ${
                                                  isFav ? 'text-primary' : 'text-textMuted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                                                }`}
                                                title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                              >
                                                <svg className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
                                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 3. Premium Frontier Models Section */}
                                {premiumModels.length > 0 && (
                                  <div className="mb-4">
                                    <div className="mb-1.5 flex items-center justify-between px-2 py-1">
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        Premium Frontier
                                      </div>
                                      <span className="rounded bg-primary/15 border border-primary/25 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary">
                                        PRO / BYOK
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {premiumModels.map((m) => {
                                        const isReachable =
                                          !currentProviderData?.reachable_models ||
                                          currentProviderData.reachable_models.length === 0 ||
                                          currentProviderData.reachable_models.includes(m);
                                        const isFav = favoriteModels.includes(m);
                                        return (
                                          <div
                                            key={m}
                                            onClick={() => {
                                              setPremiumModalData({ provider: selectedProvider!, model: m });
                                            }}
                                            className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                              selectedModel === m ? 'bg-elevated text-primary font-bold shadow-sm ring-1 ring-primary/30' : 'text-textSecondary hover:bg-elevated/50'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="truncate">{m}</span>
                                              <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
                                                PRO
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                              <svg className="h-3 w-3 text-textMuted group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                              </svg>
                                              <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                  isReachable
                                                    ? 'bg-emerald-400/90 shadow-[0_0_5px_rgba(52,211,153,0.7)]'
                                                    : 'bg-rose-500/90 shadow-[0_0_5px_rgba(244,63,94,0.7)]'
                                                }`}
                                                title={isReachable ? 'Model active and operational' : 'Model currently unavailable'}
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => toggleFavoriteModel(m, e)}
                                                className={`p-0.5 rounded transition-colors ${
                                                  isFav ? 'text-primary' : 'text-textMuted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                                                }`}
                                                title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                              >
                                                <svg className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
                                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {/* 4. Image Models Section */}
                          {currentProviderData?.image_models && currentProviderData.image_models.length > 0 && (
                            <div>
                              <div className="mb-1.5 flex items-center justify-between px-2 py-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                  Neural Synthesis (Image)
                                </div>
                                <span className="rounded bg-primary/15 border border-primary/25 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary">
                                  PRO
                                </span>
                              </div>
                              <div className="space-y-1">
                                {currentProviderData.image_models.map((m) => {
                                  const isReachable =
                                    !currentProviderData?.reachable_models ||
                                    currentProviderData.reachable_models.length === 0 ||
                                    currentProviderData.reachable_models.includes(m);
                                  const isFav = favoriteModels.includes(m);
                                  return (
                                    <div
                                      key={m}
                                      onClick={() => {
                                        setPremiumModalData({ provider: selectedProvider!, model: m });
                                      }}
                                      className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors cursor-pointer ${
                                        selectedModel === m ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_8px_rgba(217,255,0,0.1)]' : 'text-textSecondary hover:bg-elevated/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{m}</span>
                                        <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-primary border border-primary/20 shrink-0">
                                          PRO
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-1.5">
                                        <svg className="h-3 w-3 text-textMuted group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <span
                                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                            isReachable
                                              ? 'bg-emerald-400/90 shadow-[0_0_5px_rgba(52,211,153,0.7)]'
                                              : 'bg-rose-500/90 shadow-[0_0_5px_rgba(244,63,94,0.7)]'
                                          }`}
                                          title={isReachable ? 'Model active and operational' : 'Model currently unavailable'}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => toggleFavoriteModel(m, e)}
                                          className={`p-0.5 rounded transition-colors ${
                                            isFav ? 'text-primary' : 'text-textMuted/40 hover:text-primary opacity-0 group-hover:opacity-100'
                                          }`}
                                          title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                        >
                                          <svg className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'fill-none stroke-currentColor'}`} viewBox="0 0 24 24" strokeWidth="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Premium Model Unlock / Upgrade Modal */}
        <PremiumModelModal
          isOpen={!!premiumModalData}
          onClose={() => setPremiumModalData(null)}
          provider={premiumModalData?.provider || ""}
          modelName={premiumModalData?.model || ""}
          onSelectAnyway={() => {
            if (premiumModalData) {
              onModelChange(premiumModalData.provider, premiumModalData.model);
              setShowPicker(false);
              setPremiumModalData(null);
            }
          }}
        />

        {/* Disclaimer (only shown on initial empty state before first message) */}
        {showDisclaimer && (
          <p className="mt-1 text-center text-[10px] sm:text-[11px] text-textMuted/60 leading-tight select-none">
            AI can make mistakes. Chats with free models and temporary guest chats may be used by model providers for training purposes.
          </p>
        )}
      </div>
    </div>
  );
}


