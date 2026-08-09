import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProviderModels, type OpenRouterModel, searchOpenRouterModels } from "../api/api";

type MessageInputProps = {
  inputRef?: React.RefObject<MessageInputHandle> | React.MutableRefObject<MessageInputHandle | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
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
  disabled,
  isStreaming,
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outerRef) {
      (outerRef as React.MutableRefObject<MessageInputHandle | null>).current = {
        openPicker: () => setShowPicker(true),
        focus: () => inputRef.current?.focus(),
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
    <div className="border-t border-border/30 bg-background px-6 py-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <motion.div
              animate={isGlowing ? { 
                boxShadow: [
                  "0 0 0 0px rgba(217, 255, 0, 0)",
                  "0 0 0 4px rgba(217, 255, 0, 0.4)",
                  "0 0 0 0px rgba(217, 255, 0, 0)"
                ] 
              } : {}}
              transition={{ duration: 0.6, repeat: 1 }}
              className="rounded-input"
            >
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Message Neural Architect..."
                disabled={disabled || isStreaming}
                className="h-12 w-full rounded-input border border-border/50 bg-surface pl-4 pr-32 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              />
            </motion.div>
            
            {/* Model Selector Trigger */}
            {!isTempMode && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  disabled={isStreaming || availableModels.length === 0}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    isImageModel 
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/20' 
                      : 'bg-elevated/50 text-textSecondary hover:bg-elevated hover:text-textPrimary'
                  } disabled:opacity-30`}
                >
                  {isImageModel && (
                    <svg className="h-3 w-3 animate-pulse text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                  <span className="max-w-[80px] truncate">{selectedModel || "Select Model"}</span>
                  <svg className={`h-3 w-3 transition-transform ${showPicker ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={disabled || isStreaming || !value.trim()}
            className="shrink-0 rounded-input bg-primary px-5 text-sm font-semibold text-background shadow-[0_0_16px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>

        {/* Picker Popover */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-24 mb-2 min-w-[320px] overflow-hidden rounded-card border border-border/40 bg-sidebar p-1 shadow-2xl ring-1 ring-black/20 z-50"
            >
              <div className="flex h-[380px]">
                {/* Providers Column */}
                <div className="w-[100px] border-r border-border/20 bg-elevated/20 p-1">
                  <p className="mb-2 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">Providers</p>
                  <div className="space-y-0.5">
                    {availableModels.map((p) => (
                      <button
                        key={p.provider}
                        onClick={() => {
                          const defaultModel = p.text_models?.[0] || p.image_models?.[0] || "";
                          onModelChange(p.provider, defaultModel);
                        }}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                          selectedProvider === p.provider ? 'bg-primary text-background' : 'text-textSecondary hover:bg-elevated'
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
                    <div className="shrink-0 border-b border-border/20 p-1.5">
                      <div className="relative">
                        <svg className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          value={modelSearch}
                          onChange={(e) => handleModelSearch(e.target.value)}
                          placeholder="Search 200+ models..."
                          className="h-7 w-full rounded-md border border-border/30 bg-elevated/50 pl-7 pr-2 text-[11px] text-textPrimary placeholder:text-textMuted focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        {isSearching && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
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
                        <div className="space-y-0.5">
                          {searchResults.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                onModelChange(selectedProvider!, m.id);
                                setShowPicker(false);
                              }}
                              className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                                selectedModel === m.id ? 'bg-elevated text-primary font-bold' : 'text-textSecondary hover:bg-elevated/50'
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
                        <div className="space-y-0.5">
                          {currentProviderData.text_models.map((m) => (
                            <button
                              key={m}
                              onClick={() => {
                                onModelChange(selectedProvider!, m);
                                setShowPicker(false);
                              }}
                              className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                                selectedModel === m ? 'bg-elevated text-primary font-bold' : 'text-textSecondary hover:bg-elevated/50'
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
                        <div className="space-y-0.5">
                          {currentProviderData.image_models.map((m) => (
                            <button
                              key={m}
                              onClick={() => {
                                onModelChange(selectedProvider!, m);
                                setShowPicker(false);
                              }}
                              className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


