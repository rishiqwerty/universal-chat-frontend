import { AnimatePresence, motion } from "framer-motion";
import { resolveImagePath, type GeneratedImage } from "../api/api";

type Props = {
  image: GeneratedImage | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
};

export default function ImageLightbox({ image, onClose, onDelete }: Props) {
  if (!image) return null;

  const handleDownload = async () => {
    try {
      const url = resolveImagePath(image.image_url);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `studio-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback
      window.open(resolveImagePath(image.image_url), "_blank");
    }
  };

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative mx-4 max-h-[90vh] max-w-4xl overflow-hidden rounded-card border border-border/40 bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex items-center justify-center bg-background/50 p-2">
              <img
                src={resolveImagePath(image.image_url)}
                alt={image.prompt}
                className="max-h-[70vh] rounded object-contain"
              />
            </div>

            {/* Info Bar */}
            <div className="flex items-start justify-between gap-4 border-t border-border/30 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-textPrimary">{image.prompt}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
                    {image.provider}
                  </span>
                  <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
                    {image.model}
                  </span>
                  <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
                    {image.aspect_ratio}
                  </span>
                  {image.used_credits === "true" && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Credits
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="rounded-input bg-primary px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-primaryHover"
                >
                  Download
                </button>
                {/* Delete */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(image.id)}
                    className="rounded-input border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-background/70 p-2 text-textMuted backdrop-blur-sm transition-colors hover:text-textPrimary"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
