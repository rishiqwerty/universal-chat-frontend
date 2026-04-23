import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ImageLightbox from "../components/ImageLightbox";
import PageTransition from "../components/PageTransition";
import {
  getStudioModels,
  generateStudioImage,
  getStudioGallery,
  getImageStatus,
  retryStudioImage,
  deleteStudioImage,
  resolveImagePath,
  type StudioModels,
  type GeneratedImage,
} from "../api/api";

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"];
const PREVIEW_COUNT = 6;

export default function ImageStudio() {
  const [models, setModels] = useState<StudioModels>({});
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [useCredits, setUseCredits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditSuggestion, setShowCreditSuggestion] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);

  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const galleryEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Set<string>>(new Set());

  // Fetch available image models
  useEffect(() => {
    getStudioModels()
      .then((data) => {
        setModels(data);
        const providers = Object.keys(data);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
          setSelectedModel(data[providers[0]][0]);
        }
      })
      .catch(() => { });
  }, []);

  // Fetch gallery
  const refreshGallery = useCallback(() => {
    getStudioGallery()
      .then((images) => {
        setGallery(images);
        // Resume polling for any pending/generating images
        images.forEach((img) => {
          if ((img.status === "pending" || img.status === "generating") && !pollingRef.current.has(img.id)) {
            pollForCompletion(img.id);
          }
        });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  // Poll for image completion
  const pollForCompletion = useCallback((imageId: string) => {
    if (pollingRef.current.has(imageId)) return;
    pollingRef.current.add(imageId);

    const interval = setInterval(async () => {
      try {
        const updated = await getImageStatus(imageId);
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
          pollingRef.current.delete(imageId);
          // Update the gallery entry in-place
          setGallery((prev) =>
            prev.map((img) => (img.id === imageId ? updated : img))
          );
        }
      } catch {
        clearInterval(interval);
        pollingRef.current.delete(imageId);
      }
    }, 2000);
  }, []);

  // Update model when provider changes
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (models[provider]?.length > 0) {
      setSelectedModel(models[provider][0]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedProvider || !selectedModel) return;
    setGenerating(true);
    setError(null);

    try {
      // POST returns instantly with a pending record
      const pendingImage = await generateStudioImage(
        prompt,
        selectedProvider,
        selectedModel,
        aspectRatio,
        useCredits
      );
      // Add the pending record to the gallery immediately
      setGallery((prev) => [pendingImage, ...prev]);
      setPrompt("");
      setShowCreditSuggestion(false);
      setGenerating(false);

      // Start polling for this image
      pollForCompletion(pendingImage.id);
      
      // Scroll to top to show new image
      galleryEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";
      const status = err?.response?.status;
      // Detect API key related failures when using own key
      const isKeyError = !useCredits && (
        status === 400 || status === 502 ||
        /api.key|key.not|no.*key|unauthorized|invalid.*key|forbidden/i.test(detail)
      );
      if (isKeyError) {
        setError(detail || "Your API key failed. Try switching to credits.");
        setShowCreditSuggestion(true);
      } else {
        setError(detail || "Image generation failed. Please try again.");
        setShowCreditSuggestion(false);
      }
      setGenerating(false);
    }
  };

  const handleRetry = async (imageId: string) => {
    try {
      const updated = await retryStudioImage(imageId);
      // Update gallery state to 'pending' immediately
      setGallery((prev) =>
        prev.map((img) => (img.id === imageId ? updated : img))
      );
      // Resume polling
      pollForCompletion(imageId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to retry generation.");
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await deleteStudioImage(imageId);
      setGallery((prev) => prev.filter((img) => img.id !== imageId));
      if (lightboxImage?.id === imageId) setLightboxImage(null);
    } catch {
      // silent
    }
  };

  const providerKeys = Object.keys(models);
  const hasModels = providerKeys.length > 0;
  const displayedGallery = showFullGallery ? gallery : gallery.slice(0, PREVIEW_COUNT);
  const hasMore = gallery.length > PREVIEW_COUNT;

  return (
    <PageTransition>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar activeNav="studio" isAuthenticated={true} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />

          {/* Scrollable Gallery Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div ref={galleryEndRef} />

            {/* Page Header */}
            <div className="mb-6">
              <h1
                className="text-2xl font-bold text-textPrimary"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Studio
              </h1>
              <p className="mt-1 text-sm text-textMuted">
                Generate images from text prompts
              </p>
            </div>

            {/* Gallery Grid */}
            {gallery.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="text-sm font-bold uppercase tracking-wider text-textSecondary"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Recent Generations
                  </h2>
                  {hasMore && (
                    <button
                      onClick={() => setShowFullGallery(!showFullGallery)}
                      className="text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primaryHover"
                    >
                      {showFullGallery ? "Show Less" : `View All (${gallery.length})`}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <AnimatePresence>
                    {displayedGallery.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative cursor-pointer overflow-hidden rounded-card border bg-surface transition-all ${
                          img.status === "failed"
                            ? "border-red-500/30"
                            : img.status === "completed"
                            ? "border-border/30 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.06)]"
                            : "border-border/20"
                        }`}
                        onClick={() => img.status === "completed" && setLightboxImage(img)}
                      >
                        <div className="aspect-square overflow-hidden">
                          {img.status === "completed" && img.image_url ? (
                            <img
                              src={resolveImagePath(img.image_url)}
                              alt={img.prompt}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : img.status === "failed" ? (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-red-500/5 p-4">
                              <svg className="h-8 w-8 text-red-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M15 9l-6 6M9 9l6 6" />
                              </svg>
                              <p className="mt-2 text-[10px] text-red-400/80 text-center">
                                {img.error_message?.slice(0, 60) || "Generation failed"}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(img.id);
                                }}
                                className="mt-2 rounded-full bg-red-500 px-3 py-1 text-[9px] font-bold text-white transition-all hover:bg-red-600"
                              >
                                Retry
                              </button>
                            </div>
                          ) : (
                            /* pending / generating — skeleton */
                            <div className="flex h-full w-full items-center justify-center bg-elevated/50">
                              <motion.div
                                animate={{ opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex flex-col items-center gap-2"
                              >
                                <svg className="h-6 w-6 animate-spin text-primary/50" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-textMuted">
                                  {img.status === "generating" ? "Generating…" : "Queued…"}
                                </span>
                              </motion.div>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-[11px] text-textSecondary">
                            {img.prompt}
                          </p>
                          <p className="mt-0.5 text-[9px] text-textMuted">
                            {new Date(img.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(img.id);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-background/70 p-1.5 text-textMuted opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:text-red-400"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* Empty State */
              !generating && (
                <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-surface p-5">
                    <svg className="h-10 w-10 text-textMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <p className="text-sm text-textMuted">
                    Your generated images will appear here
                  </p>
                  <p className="mt-1 text-xs text-textMuted/50">
                    Describe something in the prompt below to get started
                  </p>
                </div>
              )
            )}

            {/* Generating skeleton */}
            {generating && (
              <div className="mt-6 flex justify-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 rounded-card border border-primary/20 bg-primary/5 px-5 py-3"
                >
                  <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-sm font-medium text-primary">Generating your image…</span>
                </motion.div>
              </div>
            )}
          </div>

          {/* Bottom Input Bar — pinned */}
          <div className="shrink-0 border-t border-border/40 bg-sidebar/80 backdrop-blur-xl px-6 py-4">
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={`mb-3 rounded-card border px-4 py-2.5 text-sm ${showCreditSuggestion
                    ? "border-primary/30 bg-primary/5 text-textSecondary"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                >
                  <p>{error}</p>
                  {showCreditSuggestion && (
                    <button
                      onClick={() => {
                        setUseCredits(true);
                        setError(null);
                        setShowCreditSuggestion(false);
                      }}
                      className="mt-1.5 rounded-input bg-primary px-4 py-1 text-xs font-semibold text-background transition-colors hover:bg-primaryHover"
                    >
                      Switch to Credits & Retry
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
              {/* Top row: controls */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Provider & Model */}
                {hasModels ? (
                  <>
                    <div className="min-w-[120px]">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="h-9 w-full rounded-input border border-border/60 bg-surface px-2.5 text-xs text-textPrimary outline-none focus:border-primary/50 transition-colors"
                      >
                        {providerKeys.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[160px]">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Model</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="h-9 w-full rounded-input border border-border/60 bg-surface px-2.5 text-xs text-textPrimary outline-none focus:border-primary/50 transition-colors"
                      >
                        {(models[selectedProvider] || []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="h-9 flex items-center rounded-input border border-border/40 bg-surface/50 px-3 text-xs text-textMuted">
                    No image models found.{" "}
                    <a href="/settings" className="ml-1 text-primary underline">Add a key</a>.
                  </div>
                )}

                {/* Aspect Ratio */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Aspect Ratio</label>
                  <div className="flex h-9 items-center gap-1.5">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={`h-full rounded-full px-4 text-[10px] font-bold transition-all ${aspectRatio === ar
                          ? "bg-primary text-background"
                          : "bg-surface text-textSecondary hover:bg-elevated hover:text-textPrimary"
                          }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pill Shaped Switcher */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Payment</label>
                  <div className="flex h-9 items-center rounded-full border border-border/40 bg-surface/40 p-1">
                    <button
                      onClick={() => setUseCredits(false)}
                      className={`flex h-full items-center gap-2 rounded-full px-4 transition-all ${!useCredits
                        ? "bg-elevated text-textPrimary shadow-sm"
                        : "text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Personal</span>
                    </button>

                    <button
                      onClick={() => setUseCredits(true)}
                      className={`relative flex h-full items-center gap-2 rounded-full px-4 transition-all ${useCredits
                        ? "bg-primary text-background shadow-[0_0_15px_rgba(var(--color-primary),0.4)]"
                        : "text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      {useCredits && (
                        <motion.div
                          layoutId="pill-highlight"
                          className="absolute inset-0 rounded-full bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <motion.svg
                          animate={{
                            opacity: [1, 0.4, 1, 0.2, 1],
                            filter: [
                              "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px rgba(255, 0, 255, 0))",
                              "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 12px rgba(255, 0, 255, 1))",
                              "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 4px rgba(255, 0, 255, 0.5))",
                              "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 15px rgba(255, 0, 255, 1))",
                              "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px rgba(255, 0, 255, 0))"
                            ],
                            scale: [1, 1.1, 0.9, 1.2, 1],
                          }}
                          transition={{
                            duration: 0.4,
                            repeat: Infinity,
                            repeatDelay: Math.random() * 2 + 1,
                            times: [0, 0.1, 0.2, 0.3, 1]
                          }}
                          className="h-3 w-3 text-[#FF00FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </motion.svg>
                        <span className="text-[10px] font-black uppercase tracking-wider">Use Credits</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompt + Generate */}
              <div className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !generating) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="Describe the image you want to create..."
                    rows={1}
                    disabled={generating}
                    className="block min-h-[46px] w-full resize-none rounded-card border border-border/60 bg-surface px-4 py-[11px] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(var(--color-primary),0.08)] transition-all disabled:opacity-50"
                  />
                  {useCredits && !generating && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute bottom-0 left-0 h-[2px] bg-primary/30 w-full rounded-full"
                    />
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || !hasModels}
                  className={`relative h-[46px] shrink-0 overflow-hidden rounded-card px-8 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${useCredits
                    ? "bg-primary text-background shadow-[0_0_20px_rgba(var(--color-primary),0.25)]"
                    : "bg-surface border border-border text-textPrimary hover:border-primary/50"
                    }`}
                >
                  <div className="relative z-10 flex items-center gap-2">
                    {generating ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Architecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate</span>
                        {useCredits && (
                          <div className="flex items-center gap-1 border-l border-background/20 pl-2">
                            <motion.svg
                              animate={{
                                opacity: [1, 0.4, 1, 0.2, 1],
                                filter: [
                                  "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px rgba(255, 0, 255, 0))",
                                  "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 10px rgba(255, 0, 255, 1))",
                                  "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 4px rgba(255, 0, 255, 0.5))",
                                  "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 12px rgba(255, 0, 255, 1))",
                                  "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px rgba(255, 0, 255, 0))"
                                ],
                                scale: [1, 1.2, 0.8, 1.4, 1],
                              }}
                              transition={{
                                duration: 0.3,
                                repeat: Infinity,
                                repeatDelay: Math.random() * 3 + 0.5,
                                times: [0, 0.1, 0.15, 0.25, 1]
                              }}
                              className="h-2.5 w-2.5 text-[#FF00FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </motion.svg>
                            <span className="text-[10px] font-black uppercase tracking-tighter">5 Credits</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Shine effect */}
                  {!generating && (
                    <motion.div
                      className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox */}
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
          onDelete={(id) => {
            handleDelete(id);
            setLightboxImage(null);
          }}
        />
      </div>
    </PageTransition>
  );
}
