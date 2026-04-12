import { useRef, useEffect, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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

  // Scroll to bottom programmatically
  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // Reset the flag after scroll animation completes
    setTimeout(() => {
      isAutoScrolling.current = false;
      setUserScrolledUp(false);
    }, 400);
  }, []);

  // Track user scroll
  const handleScroll = useCallback(() => {
    if (isAutoScrolling.current) return;
    setUserScrolledUp(!isNearBottom());
  }, [isNearBottom]);

  // Auto-scroll when messages change, unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userScrolledUp]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} onDelete={onDeleteMessage ? () => onDeleteMessage(m.id) : undefined} />
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
