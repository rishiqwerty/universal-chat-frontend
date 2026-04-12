import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ProviderModels } from "../api/api";

type MessageInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  availableModels: ProviderModels[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onModelChange: (provider: string, model: string) => void;
};

export interface MessageInputHandle {
  openPicker: () => void;
  focus: () => void;
  triggerGlow: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(({
  value,
  onChange,
  onSend,
  disabled,
  isStreaming,
  availableModels,
  selectedProvider,
  selectedModel,
  onModelChange,
}, ref) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPicker: () => setShowPicker(true),
    focus: () => inputRef.current?.focus(),
    triggerGlow: () => {
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 1200);
    }
  }));

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
                className="min-h-[48px] w-full rounded-input border border-border/50 bg-surface pl-4 pr-32 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              />
            </motion.div>
            
            {/* Model Selector Trigger */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                disabled={isStreaming || availableModels.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-elevated/50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-textSecondary transition-colors hover:bg-elevated hover:text-textPrimary disabled:opacity-30"
              >
                <span className="max-w-[80px] truncate">{selectedModel || "Select Model"}</span>
                <svg className={`h-3 w-3 transition-transform ${showPicker ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
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
              className="absolute bottom-full right-24 mb-2 min-w-[280px] overflow-hidden rounded-card border border-border/40 bg-sidebar p-1 shadow-2xl ring-1 ring-black/20 z-50"
            >
              <div className="flex h-[320px]">
                {/* Providers Column */}
                <div className="w-1/3 border-r border-border/20 bg-elevated/20 p-1">
                  <p className="mb-2 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">Providers</p>
                  <div className="space-y-0.5">
                    {availableModels.map((p) => (
                      <button
                        key={p.provider}
                        onClick={() => onModelChange(p.provider, p.models[0])}
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
                <div className="flex-1 p-1 overflow-y-auto custom-scrollbar">
                  <p className="mb-2 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-textMuted">Models</p>
                  <div className="space-y-0.5">
                    {currentProviderData?.models.map((m) => (
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default MessageInput;

