import { useRef, useEffect, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  isComplete?: boolean;
  images?: string[];
  provider_metadata?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
};

type ChatWindowProps = {
  messages: ChatMessage[];
  onDeleteMessage?: (id: string) => void;
};

export default function ChatWindow({ messages, onDeleteMessage }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const isAutoScrolling = useRef(false);

  // Check if user is near the bottom
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // Smooth auto-scroll helper
  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolledUp(false);
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 300);
  }, []);

  // Handle scroll events to detect if user manually scrolled up
  const handleScroll = useCallback(() => {
    if (isAutoScrolling.current) return;
    if (!isNearBottom()) {
      setUserScrolledUp(true);
    } else {
      setUserScrolledUp(false);
    }
  }, [isNearBottom]);

  // Scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userScrolledUp]);

  return (
    <div className="relative flex-1 overflow-hidden bg-background">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {messages.map((m) => (
            <MessageBubble 
              key={m.id} 
              id={m.id}
              role={m.role} 
              content={m.content} 
              images={m.images}
              provider={m.provider} 
              model={m.model} 
              isComplete={m.isComplete} 
              providerMetadata={m.provider_metadata}
              onDelete={onDeleteMessage} 
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating scroll-to-bottom button */}
      {userScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background shadow-[0_0_16px_rgba(217,255,0,0.3)] transition-all hover:bg-primaryHover hover:scale-110 animate-fade-in"
          aria-label="Scroll to latest message"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
