import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProviderModels, type OpenRouterModel, searchOpenRouterModels } from "../api/api";

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
}: MessageInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [searchResults, setSearchResults] = useState<OpenRouterModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isInputBlocked = disabled || isStreaming || (Boolean(isLoadingModels) && !isTempMode);

  // Auto-resize textarea height: 1 line by default, extends only when multi-line
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = window.innerWidth < 640 ? 24 : 26;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), 180)}px`;
    }
  }, [value]);

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

  const currentProviderData = availableModels.find((p) => p.provider === selectedProvider);
  const isImageModel = currentProviderData?.image_models?.includes(selectedModel || "");
  const isOpenRouter = selectedProvider === "openrouter";
  const isOpenRouterBYOK = isOpenRouter && !currentProviderData?.is_free;

  // Debounced search for OpenRouter models
  const handleModelSearch = useCallback((query: string) => {
    setModelSearch(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) {
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
  }, []);

  // Reset search when picker closes or provider changes
  useEffect(() => {
    if (!showPicker) {
      setModelSearch("");
      setSearchResults([]);
    }
  }, [showPicker, selectedProvider]);

  return (
    <div className="border-t border-border/30 bg-background px-2.5 py-1.5 sm:px-4 sm:py-2.5">
      <div className="mx-auto flex max-w-4xl flex-col gap-1.5 relative">
        <motion.div
          animate={isGlowing ? { 
            boxShadow: [
              "0 0 0 0px rgba(217, 255, 0, 0)",
              "0 0 0 4px rgba(217, 255, 0, 0.4)",
              "0 0 0 0px rgba(217, 255, 0, 0)"
            ] 
          } : {}}
          transition={{ duration: 0.6, repeat: 1 }}
          className="relative flex flex-col rounded-xl sm:rounded-2xl border border-border/60 bg-surface/95 shadow-sm backdrop-blur-md transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40 focus-within:shadow-[0_0_20px_rgba(217,255,0,0.06)]"
        >
          {/* Top: Auto-expanding Textarea */}
          <div className="w-full px-2.5 pt-1.5 sm:px-3.5 sm:pt-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
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
              className="min-h-[24px] sm:min-h-[26px] max-h-[180px] w-full resize-none bg-transparent text-[14px] sm:text-sm text-textPrimary placeholder:text-textMuted focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-snug custom-scrollbar py-0"
            />
          </div>

          {/* Bottom Toolbar: Model Selector on Left, Send/Stop on Right */}
          <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-0.5 sm:px-2.5 sm:pb-2">
            {/* Left: Model Selector */}
            <div className="flex items-center">
              {!isTempMode && (
                <div>
                  {isLoadingModels ? (
                    <div className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-textMuted bg-elevated/40 border border-border/30">
                      <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPicker(!showPicker)}
                      disabled={isStreaming || availableModels.length === 0}
                      className={`group flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all ${
                        isImageModel 
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20' 
                          : 'bg-elevated/60 text-textSecondary hover:bg-elevated hover:text-textPrimary border border-border/20'
                      } disabled:opacity-30`}
                      title="Select model"
                    >
                      {isImageModel ? (
                        <svg className="h-2.5 w-2.5 animate-pulse text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary transition-colors shrink-0" />
                      )}
                      <span className="max-w-[100px] sm:max-w-[150px] truncate">{selectedModel || "Select Model"}</span>
                      <svg className={`h-2.5 w-2.5 shrink-0 text-textMuted transition-transform ${showPicker ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Send or Stop button */}
            <div className="flex items-center gap-1.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-red-500/40 bg-red-500/15 px-2.5 text-[10px] font-bold uppercase tracking-wider text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500 hover:text-white"
                  title="Stop generating AI response"
                >
                  <span className="h-1.5 w-1.5 rounded-sm bg-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSend}
                  disabled={isInputBlocked || !value.trim()}
                  className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-lg bg-primary text-background shadow-[0_0_10px_rgba(217,255,0,0.2)] transition-all hover:bg-primaryHover hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                  title="Send message (Enter)"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>
          </div>
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
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-x-3 bottom-20 z-50 max-h-[80vh] overflow-hidden rounded-2xl border border-border/50 bg-sidebar shadow-2xl ring-1 ring-black/40 sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:right-auto sm:mb-2 sm:w-[380px] sm:max-w-md sm:rounded-card"
              >
                {/* Mobile Header Bar */}
                <div className="flex items-center justify-between border-b border-border/20 px-3.5 py-2.5 sm:hidden bg-elevated/40">
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

                <div className="flex h-[320px] sm:h-[380px]">
                  {/* Providers Column */}
                  <div className="w-[110px] shrink-0 border-r border-border/20 bg-elevated/20 p-1.5 overflow-y-auto custom-scrollbar">
                    <p className="mb-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-textMuted">Providers</p>
                    <div className="space-y-1">
                      {availableModels.map((p) => (
                        <button
                          key={p.provider}
                          type="button"
                          onClick={() => {
                            const defaultModel = p.text_models?.[0] || p.image_models?.[0] || "";
                            onModelChange(p.provider, defaultModel);
                          }}
                          className={`w-full rounded-lg px-2 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] font-semibold transition-colors ${
                            selectedProvider === p.provider ? 'bg-primary text-background font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated'
                          }`}
                        >
                          {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Models Column */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* OpenRouter Search Bar */}
                    {isOpenRouterBYOK && (
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
                            placeholder="Search 200+ models..."
                            className="h-8 w-full rounded-lg border border-border/30 bg-elevated/50 pl-8 pr-2 text-xs sm:text-[11px] text-textPrimary placeholder:text-textMuted focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          {isSearching && (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                      {/* Search Results (OpenRouter BYOK only) */}
                      {isOpenRouterBYOK && searchResults.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                            Search Results
                          </div>
                          <div className="space-y-1">
                            {searchResults.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  onModelChange(selectedProvider!, m.id);
                                  setShowPicker(false);
                                }}
                                className={`w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors ${
                                  selectedModel === m.id ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                }`}
                              >
                                <span>{m.id}</span>
                                {m.context_length && (
                                  <span className="ml-1.5 text-[9px] text-textMuted">{Math.round(m.context_length / 1000)}k</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Text Models Section */}
                      {currentProviderData?.text_models && currentProviderData.text_models.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {isOpenRouter ? "Featured Models" : "Text Analytics"}
                          </div>
                          <div className="space-y-1">
                            {currentProviderData.text_models.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  onModelChange(selectedProvider!, m);
                                  setShowPicker(false);
                                }}
                                className={`w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors ${
                                  selectedModel === m ? 'bg-elevated text-primary font-bold shadow-sm' : 'text-textSecondary hover:bg-elevated/50'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image Models Section */}
                      {currentProviderData?.image_models && currentProviderData.image_models.length > 0 && (
                        <div>
                          <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Neural Synthesis (Image)
                          </div>
                          <div className="space-y-1">
                            {currentProviderData.image_models.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  onModelChange(selectedProvider!, m);
                                  setShowPicker(false);
                                }}
                                className={`w-full rounded-lg px-2.5 py-2 sm:py-1.5 text-left text-xs sm:text-[11px] transition-colors ${
                                  selectedModel === m ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_8px_rgba(217,255,0,0.1)]' : 'text-textSecondary hover:bg-elevated/50'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


