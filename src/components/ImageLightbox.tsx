import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BeforeAfterSlider from "./BeforeAfterSlider";
import SocialShareModal from "./SocialShareModal";
import ImageEditMenu from "./ImageEditMenu";
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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
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

                    {/* Source Reference Thumbnails */}
                    {(image.reference_image_url || (image as any).secondary_reference_image_url || (image as any).secondary_image_url || (image as any).outfit_image_url) && (
                      <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-border/20">
                        <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Source References:</span>
                        <div className="flex items-center gap-2">
                          {image.reference_image_url && (
                            <a
                              href={resolveImagePath(image.reference_image_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative flex items-center gap-1.5 rounded-lg border border-border/40 bg-elevated/40 p-1.5 hover:border-primary/40 transition-colors"
                              title="View Person / Primary Reference"
                            >
                              <img
                                src={resolveImagePath(image.reference_image_thumbnail_url || image.reference_image_url)}
                                alt="Person Reference"
                                className="h-8 w-8 rounded object-cover"
                              />
                              <span className="text-[10px] font-semibold text-textSecondary group-hover:text-primary pr-1">
                                👤 Person
                              </span>
                            </a>
                          )}

                          {((image as any).secondary_reference_image_url || (image as any).secondary_image_url || (image as any).outfit_image_url) && (
                            <a
                              href={resolveImagePath((image as any).secondary_reference_image_url || (image as any).secondary_image_url || (image as any).outfit_image_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative flex items-center gap-1.5 rounded-lg border border-border/40 bg-elevated/40 p-1.5 hover:border-primary/40 transition-colors"
                              title="View Outfit Reference"
                            >
                              <img
                                src={resolveImagePath((image as any).secondary_reference_image_thumbnail_url || (image as any).secondary_reference_image_url || (image as any).secondary_image_url || (image as any).outfit_image_url)}
                                alt="Outfit Reference"
                                className="h-8 w-8 rounded object-cover"
                              />
                              <span className="text-[10px] font-semibold text-textSecondary group-hover:text-primary pr-1">
                                👗 Outfit
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end md:self-start">
                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center gap-1.5 rounded-input border border-border/40 bg-surface px-3 py-2 text-xs font-semibold text-textSecondary transition-colors hover:border-primary/50 hover:text-primary hover:bg-surface-elevated"
                  title="Share to WhatsApp, Instagram, X..."
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>Share</span>
                </button>

                {/* Edit Action Menu */}
                {!isPreset(image) && (
                  <button
                    type="button"
                    onClick={() => setIsEditMenuOpen(true)}
                    className="flex items-center gap-1.5 rounded-input border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-background transition-all"
                    title="Transform Image: Expand, Remove BG, Upscale, Remix"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Transform</span>
                    <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                )}

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
                    className="flex items-center gap-1.5 rounded-input border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Recreate</span>
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

            {/* Social Share Modal */}
            <SocialShareModal
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              imageUrl={image.image_url || ""}
              prompt={isPreset(image) ? image.title : image.prompt}
              title={isPreset(image) ? image.title : undefined}
            />

            {/* Image Edit & Transform Menu */}
            <ImageEditMenu
              isOpen={isEditMenuOpen}
              onClose={() => setIsEditMenuOpen(false)}
              image={image}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
