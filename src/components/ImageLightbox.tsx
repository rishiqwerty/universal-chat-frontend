import { AnimatePresence, motion } from "framer-motion";
import BeforeAfterSlider from "./BeforeAfterSlider";
import { resolveImagePath, getProxyDownloadUrl, type GeneratedImage, type StudioPreset } from "../api/api";

type Props = {
  image: GeneratedImage | StudioPreset | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onRecreate?: (preset: StudioPreset) => void;
};

const isPreset = (img: any): img is StudioPreset => {
  return img && "title" in img;
};

export default function ImageLightbox({ image, onClose, onDelete, onRecreate }: Props) {
  if (!image || !image.image_url) return null;

  const handleDownload = async () => {
    try {
      const url = getProxyDownloadUrl(image.image_url || "");
      const token = localStorage.getItem("access_token");
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const downloadName = isPreset(image) 
        ? `${image.title.toLowerCase().replace(/_/g, "-")}.png`
        : `studio-${image.id}.png`;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback to proxy download to force attachment download
      window.open(getProxyDownloadUrl(image.image_url || ""), "_blank");
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
            className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-card border border-border/40 bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image / Before After Slider */}
            <div className="flex items-center justify-center bg-background/50 p-2">
              {isPreset(image) && image.before_image_url ? (
                <div className="w-full flex items-center justify-center p-1">
                  <BeforeAfterSlider
                    beforeImage={resolveImagePath(image.before_image_url)}
                    afterImage={resolveImagePath(image.thumbnail_url || image.image_url)}
                    altTitle={image.title}
                    aspectRatio="aspect-square"
                    className="max-h-[55vh] max-w-[500px] w-full mx-auto"
                  />
                </div>
              ) : (
                <img
                  src={resolveImagePath(image.thumbnail_url || image.image_url)}
                  alt={isPreset(image) ? image.title : image.prompt}
                  className="max-h-[60vh] rounded object-contain"
                />
              )}
            </div>

            {/* Info Bar */}
            <div className="flex flex-col gap-4 border-t border-border/30 px-6 py-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                {isPreset(image) ? (
                  <>
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-textPrimary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {image.title} <span className="text-[10px] font-semibold text-textMuted lowercase ml-1">{image.version}</span>
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-textSecondary">{image.description}</p>
                    {image.prompt && (
                      <p className="mt-2.5 rounded bg-elevated/40 border border-border/40 p-2.5 font-mono text-[10px] text-textMuted select-all leading-normal whitespace-pre-wrap max-h-[80px] overflow-y-auto">
                        {image.prompt}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        {image.category}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              <div className="flex shrink-0 gap-2 self-end md:self-start">
                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="rounded-input bg-primary px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-primaryHover"
                >
                  Download
                </button>
                {/* Recreate Preset */}
                {isPreset(image) && onRecreate && (
                  <button
                    onClick={() => {
                      onRecreate(image);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-input border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                  >
                    Recreate ⚡
                  </button>
                )}
                {/* Delete */}
                {!isPreset(image) && onDelete && (
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
