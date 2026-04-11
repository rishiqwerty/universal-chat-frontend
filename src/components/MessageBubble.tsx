type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(100%,36rem)] rounded-card px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-userBubble text-textPrimary"
            : "bg-surface text-textSecondary"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
