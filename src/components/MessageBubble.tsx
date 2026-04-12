import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[min(100%,36rem)] rounded-card px-4 py-3 text-sm leading-relaxed bg-userBubble text-textPrimary">
          {content}
        </div>
      </div>
    );
  }

  // Show thinking animation while waiting for stream
  if (!content) {
    return (
      <div className="flex w-full justify-start">
        <div className="flex items-center gap-1.5 rounded-card bg-surface px-4 py-3">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[min(100%,48rem)] rounded-card px-4 py-3 text-sm leading-relaxed bg-surface text-textSecondary prose-chat">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom heading renderers
            h1: ({ children }) => (
              <h1 className="mt-4 mb-2 text-xl font-bold text-textPrimary">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-3 mb-2 text-lg font-bold text-textPrimary">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-3 mb-1 text-base font-semibold text-textPrimary">{children}</h3>
            ),
            // Paragraphs
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
            ),
            // Inline code
            code: ({ className, children, ...props }) => {
              const isBlock = className?.includes("hljs") || className?.includes("language-");
              if (isBlock) {
                return (
                  <code className={`${className || ""}`} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded bg-elevated px-1.5 py-0.5 text-[13px] font-medium text-primary" {...props}>
                  {children}
                </code>
              );
            },
            // Code blocks
            pre: ({ children }) => (
              <pre className="my-3 overflow-x-auto rounded-input bg-[#0d0d0e] p-4 text-[13px] leading-relaxed ring-1 ring-border/30">
                {children}
              </pre>
            ),
            // Lists
            ul: ({ children }) => (
              <ul className="mb-2 ml-4 list-disc space-y-1 marker:text-textMuted">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 ml-4 list-decimal space-y-1 marker:text-textMuted">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            // Blockquote
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-primary/40 pl-4 italic text-textMuted">
                {children}
              </blockquote>
            ),
            // Tables
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-border/60 text-left text-textPrimary">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border/20 px-3 py-2">{children}</td>
            ),
            // Links
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primaryHover">
                {children}
              </a>
            ),
            // Horizontal rule
            hr: () => <hr className="my-4 border-border/40" />,
            // Bold & italic
            strong: ({ children }) => <strong className="font-semibold text-textPrimary">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
