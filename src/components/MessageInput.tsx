type MessageInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function MessageInput({ value, onChange, onSend, disabled }: MessageInputProps) {
  return (
    <div className="border-t border-border/30 bg-background px-6 py-4">
      <div className="mx-auto flex max-w-4xl gap-3">
        <input
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
          disabled={disabled}
          className="min-h-[48px] flex-1 rounded-input border border-border/50 bg-surface px-4 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-input bg-primary px-5 text-sm font-semibold text-background shadow-[0_0_16px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
