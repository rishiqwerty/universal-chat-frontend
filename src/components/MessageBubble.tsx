import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { resolveImagePath } from "../api/api";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  onDelete?: () => void;
  provider?: string;
  model?: string;
  isComplete?: boolean;
};

export default function MessageBubble({ role, content, images, onDelete, provider, model, isComplete }: MessageBubbleProps) {
  const isUser = role === "user";

  const renderImages = () => {
    if (!images || images.length === 0) return null;
    
    return (
      <div className={`mt-3 grid gap-2 ${
        images.length === 1 
          ? "grid-cols-1" 
          : images.length === 2 
          ? "grid-cols-2" 
          : "grid-cols-2 md:grid-cols-3"
      }`}>
        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="group/img relative aspect-square overflow-hidden rounded-lg border border-border/20 bg-elevated/10"
          >
            <img 
              src={resolveImagePath(img)} 
              alt={`Generated ${idx + 1}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover/img:opacity-100" />
            <a 
              href={resolveImagePath(img)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 rounded-full bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/img:opacity-100 hover:bg-black/60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    );
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end group">
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-textMuted opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-surface"
              title="Delete message"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          <div className="max-w-[min(100%,36rem)] rounded-card px-4 py-3 text-sm leading-relaxed bg-userBubble text-textPrimary">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Show thinking animation while waiting for stream or images
  if (!content && (!images || images.length === 0)) {
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
    <div className="flex w-full flex-col justify-start group">
      <div className="flex items-start gap-2">
        <div className="max-w-[min(100%,48rem)] rounded-card px-4 py-3 text-sm leading-relaxed bg-surface text-textSecondary prose-chat shadow-sm">
          {content && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => <h1 className="mt-4 mb-2 text-xl font-bold text-textPrimary">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-3 mb-2 text-lg font-bold text-textPrimary">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-3 mb-1 text-base font-semibold text-textPrimary">{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes("hljs") || className?.includes("language-");
                  if (isBlock) return <code className={`${className || ""}`} {...props}>{children}</code>;
                  return <code className="rounded bg-elevated px-1.5 py-0.5 text-[13px] font-medium text-primary" {...props}>{children}</code>;
                },
                pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-input bg-[#0d0d0e] p-4 text-[13px] leading-relaxed ring-1 ring-border/30">{children}</pre>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 marker:text-textMuted">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 marker:text-textMuted">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/40 pl-4 italic text-textMuted">{children}</blockquote>,
                table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
                thead: ({ children }) => <thead className="border-b border-border/60 text-left text-textPrimary">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{children}</th>,
                td: ({ children }) => <td className="border-b border-border/20 px-3 py-2">{children}</td>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primaryHover">{children}</a>,
                hr: () => <hr className="my-4 border-border/40" />,
                strong: ({ children }) => <strong className="font-semibold text-textPrimary">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
          {renderImages()}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="mt-2 p-1 rounded text-textMuted opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-surface"
            title="Delete message"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
      </div>
      {(model || provider) && (
        <div className="mt-1.5 flex flex-col gap-0.5 px-3 truncate max-w-[min(100%,48rem)]">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60 leading-tight">{provider || "AI"}</span>
          <span className="text-[10px] font-medium text-textMuted/60 leading-tight tracking-tight">{model}</span>
        </div>
      )}
      {isComplete === false && (
        <div className="mt-2 flex items-center gap-2 px-3">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
          </div>
          <span className="text-[10px] font-medium text-textMuted/50">Processing Neural Synthesis...</span>
        </div>
      )}
    </div>
  );
}
