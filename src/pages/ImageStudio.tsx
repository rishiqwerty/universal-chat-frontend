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
  getQueueStatus,
  type StudioModels,
  type GeneratedImage,
  type QueueStatus,
} from "../api/api";

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"];
const PREVIEW_COUNT = 6;

export default function ImageStudio() {
  const [models, setModels] = useState<StudioModels>({});
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [paymentMode, setPaymentMode] = useState<"own_key" | "credits" | "free_queue">("own_key");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditSuggestion, setShowCreditSuggestion] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const galleryEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Set<string>>(new Set());

  // Fetch available image models and queue status
  useEffect(() => {
    getStudioModels()
      .then((data) => {
        setModels(data);
        const providers = Object.keys(data);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
          const providerModels = data[providers[0]];
          if (providerModels && providerModels.length > 0) {
            setSelectedModel(providerModels[0]);
          }
        }
      })
      .catch(() => { });

    getQueueStatus().then(setQueueStatus).catch(() => { });
  }, []);

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
          setGallery((prev) =>
            prev.map((img) => (img.id === imageId ? updated : img))
          );
        }
      } catch {
        clearInterval(interval);
        pollingRef.current.delete(imageId);
      }
    }, 3000);

    // Store interval globally to clear on unmount
    (window as any)[`poll_${imageId}`] = interval;
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach(id => {
        const interval = (window as any)[`poll_${id}`];
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  // Fetch gallery
  useEffect(() => {
    getStudioGallery()
      .then((images) => {
        setGallery(images);
        // Resume polling for any non-terminal images
        images.forEach((img) => {
          if ((img.status === "pending" || img.status === "generating" || img.status === "queued") && !pollingRef.current.has(img.id)) {
            pollForCompletion(img.id);
          }
        });
      })
      .catch(() => { });
  }, [pollForCompletion]);

  // Update model when provider changes
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (models[provider]?.length > 0) {
      setSelectedModel(models[provider][0]);
    }
  };

  const handleGenerate = async () => {
    // If free_queue, we don't need provider/model selected. Just prompt.
    if (!prompt.trim() || (paymentMode !== "free_queue" && (!selectedProvider || !selectedModel))) return;
    setGenerating(true);
    setError(null);

    try {
      // POST returns instantly with a pending/queued record
      const pendingImage = await generateStudioImage(
        prompt,
        paymentMode === "free_queue" ? "local" : selectedProvider,
        paymentMode === "free_queue" ? "system_default" : selectedModel,
        aspectRatio,
        paymentMode
      );
      // Add the pending/queued record to the gallery immediately
      setGallery((prev) => [pendingImage, ...prev]);
      setPrompt("");
      setShowCreditSuggestion(false);
      setGenerating(false);

      if (paymentMode === "free_queue") {
        // Refresh queue status
        getQueueStatus().then(setQueueStatus).catch(() => { });
      }

      // Always start polling for non-completed images
      pollForCompletion(pendingImage.id);


      // Scroll to top to show new image
      galleryEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";
      const status = err?.response?.status;
      // Detect API key related failures when using own key
      const isKeyError = paymentMode === "own_key" && (
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
  const displayedGallery = gallery.slice(0, visibleCount);
  const hasMore = gallery.length > visibleCount;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (scrollWidth - (scrollLeft + clientWidth) < 100 && hasMore) {
      setVisibleCount(prev => prev + 6);
    }
  };

  return (
    <PageTransition>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar activeNav="studio" isAuthenticated={true} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar hideIncognito={true} />

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
                <div
                  onScroll={handleScroll}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
                >
                  <AnimatePresence>
                    {displayedGallery.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative w-[240px] flex-shrink-0 cursor-pointer overflow-hidden rounded-card border bg-surface transition-all snap-start ${img.status === "failed"
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
                            <div className="flex h-full w-full flex-col items-center justify-center bg-red-500/10 p-4 relative overflow-hidden">
                              <motion.div
                                animate={{
                                  opacity: [0.05, 0.15, 0.05],
                                  scale: [1, 1.05, 1]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 bg-red-500/20"
                              />
                              <motion.div
                                animate={{
                                  x: [-1, 1, -1, 0],
                                  filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"]
                                }}
                                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
                              >
                                <svg className="h-10 w-10 text-red-500/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M15 9l-6 6M9 9l6 6" />
                                </svg>
                              </motion.div>
                              <p className="mt-3 text-[10px] font-bold text-red-400 text-center relative z-10 px-2 leading-relaxed">
                                {img.error_message?.slice(0, 80) || "System Failure"}
                              </p>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(img.id);
                                }}
                                className="mt-4 relative z-10 rounded-full bg-red-500 px-5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                              >
                                Try Again
                              </motion.button>
                            </div>
                          ) : img.status === "queued" ? (
                            /* queued — Waiting room animation */
                            <div className="flex h-full w-full flex-col items-center justify-center bg-amber-500/[0.03] relative overflow-hidden">
                              <div className="flex flex-col items-center gap-4 relative z-10 scale-75">
                                {/* Mixing Animation (Scaled Down) */}
                                <div className="relative h-16 w-20 flex items-center justify-center">
                                  {/* Mixing Particles */}
                                  {[...Array(4)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      animate={{
                                        y: [-10, -30],
                                        x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
                                        opacity: [0, 0.8, 0],
                                        scale: [0.4, 0.8]
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.4
                                      }}
                                      className="absolute top-0 h-1.5 w-1.5 rounded-full bg-amber-500/20"
                                    />
                                  ))}

                                  {/* The Bowl */}
                                  <div className="absolute bottom-0 h-8 w-16 border-b-2 border-x-2 border-amber-900/20 rounded-b-full bg-amber-500/5 overflow-hidden">
                                    {/* Noodles */}
                                    <svg className="absolute inset-0 h-full w-full text-amber-500/20" viewBox="0 0 20 10">
                                      {[...Array(6)].map((_, i) => (
                                        <motion.path
                                          key={i}
                                          d={`M ${2 + i * 2.5} 10 Q ${5 + i * 2.5} ${2 + (i % 2) * 3} ${8 + i * 2.5} 10`}
                                          stroke="currentColor"
                                          strokeWidth="1"
                                          fill="none"
                                          animate={{
                                            d: [
                                              `M ${2 + i * 2.5} 10 Q ${5 + i * 2.5} ${2 + (i % 2) * 3} ${8 + i * 2.5} 10`,
                                              `M ${2 + i * 2.5} 10 Q ${5 + i * 2.5} ${6 - (i % 2) * 3} ${8 + i * 2.5} 10`,
                                              `M ${2 + i * 2.5} 10 Q ${5 + i * 2.5} ${2 + (i % 2) * 3} ${8 + i * 2.5} 10`,
                                            ]
                                          }}
                                          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                                        />
                                      ))}
                                    </svg>
                                  </div>

                                  {/* Chopstick 1 */}
                                  <motion.div
                                    animate={{
                                      rotate: [-15, -35, -15],
                                      x: [-4, 4, -4],
                                      y: [0, 4, 0]
                                    }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute bottom-3 left-5 h-12 w-0.5 bg-amber-900/30 rounded-full origin-bottom"
                                    style={{ transform: "rotate(-25deg)" }}
                                  />

                                  {/* Chopstick 2 */}
                                  <motion.div
                                    animate={{
                                      rotate: [15, 35, 15],
                                      x: [4, -4, 4],
                                      y: [0, 4, 0]
                                    }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                                    className="absolute bottom-3 right-5 h-12 w-0.5 bg-amber-900/30 rounded-full origin-bottom"
                                    style={{ transform: "rotate(25deg)" }}
                                  />
                                </div>

                                <div className="flex flex-col items-center gap-2 px-6">
                                  <span className="text-[12px] font-black uppercase tracking-[0.15em] text-amber-600/80 text-center leading-relaxed">
                                    Hang tight — your image is cooking 🚀
                                  </span>
                                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-amber-600/40 text-center">
                                    (This might take a couple of hours)
                                  </span>
                                  <motion.div
                                    className="flex gap-1 mt-1"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  >
                                    <div className="h-1 w-1 rounded-full bg-amber-500/30" />
                                    <div className="h-1 w-1 rounded-full bg-amber-500/30" />
                                    <div className="h-1 w-1 rounded-full bg-amber-500/30" />
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* pending / generating — High-Energy Plasma Forge */
                            <div className="flex h-full w-full items-center justify-center bg-background relative overflow-hidden">
                              {/* Background Plasma Morph */}
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1.1, 1.3, 1],
                                  opacity: [0.1, 0.2, 0.15, 0.25, 0.1],
                                  borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "50% 50% 20% 80% / 25% 80% 20% 75%", "30% 70% 70% 30% / 30% 30% 70% 70%"]
                                }}
                                transition={{ duration: 10, repeat: Infinity }}
                                className="absolute inset-4 bg-primary blur-3xl"
                              />

                              {/* Energy Scanline */}
                              <motion.div
                                animate={{ y: ["-100%", "400%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-transparent via-primary/20 to-transparent z-10"
                              />

                              {/* Circular Orbiters */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                {[...Array(3)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
                                    className="absolute border border-primary/20 rounded-full"
                                    style={{
                                      width: 100 + i * 30,
                                      height: 100 + i * 30,
                                      borderDasharray: i === 1 ? "4 4" : "none"
                                    }}
                                  />
                                ))}
                              </div>

                              <div className="flex flex-col items-center gap-4 relative z-20">
                                <div className="relative">
                                  {/* The Core */}
                                  <motion.div
                                    animate={{
                                      scale: [1, 1.2, 1],
                                      boxShadow: [
                                        "0 0 20px rgba(var(--color-primary), 0.2)",
                                        "0 0 40px rgba(var(--color-primary), 0.6)",
                                        "0 0 20px rgba(var(--color-primary), 0.2)"
                                      ]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="h-12 w-12 rounded-full bg-primary flex items-center justify-center relative z-10"
                                  >
                                    <svg className="h-6 w-6 text-background animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </motion.div>

                                  {/* Spinning Particles */}
                                  {[...Array(8)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      animate={{
                                        rotate: 360,
                                        scale: [0.8, 1.2, 0.8]
                                      }}
                                      transition={{
                                        rotate: { duration: 2 + i * 0.2, repeat: Infinity, ease: "linear" },
                                        scale: { duration: 1, repeat: Infinity }
                                      }}
                                      className="absolute inset-0"
                                    >
                                      <div
                                        className="h-1.5 w-1.5 rounded-full bg-primary"
                                        style={{ transform: `translate(${25 + i * 2}px, 0)` }}
                                      />
                                    </motion.div>
                                  ))}
                                </div>

                                <div className="flex flex-col items-center">
                                  <motion.span
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-[11px] font-black uppercase tracking-[0.3em] text-primary"
                                  >
                                    {img.status === "generating" ? "Forging" : "Materializing"}
                                  </motion.span>
                                  <div className="h-0.5 w-12 bg-surface-elevated mt-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                      animate={{ x: ["-100%", "100%"] }}
                                      transition={{ duration: 1, repeat: Infinity }}
                                      className="h-full w-full bg-primary"
                                    />
                                  </div>
                                </div>
                              </div>
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
                {paymentMode !== "free_queue" && (
                  hasModels ? (
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
                  )
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
                      onClick={() => setPaymentMode("own_key")}
                      className={`relative flex h-full items-center gap-2 rounded-full px-4 transition-all ${paymentMode === "own_key"
                        ? "text-textPrimary"
                        : "text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      {paymentMode === "own_key" && (
                        <motion.div
                          layoutId="pill-highlight"
                          className="absolute inset-0 rounded-full bg-elevated shadow-sm ring-1 ring-border/20"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Personal</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMode("credits")}
                      className={`relative flex h-full items-center gap-2 rounded-full px-4 transition-all ${paymentMode === "credits"
                        ? "bg-primary text-background shadow-[0_0_15px_rgba(var(--color-primary),0.4)]"
                        : "text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      {paymentMode === "credits" && (
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
                          className={`h-3 w-3 ${paymentMode === "credits" ? "text-[#FF00FF]" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </motion.svg>
                        <span className="text-[10px] font-black uppercase tracking-wider">Use Credits</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMode("free_queue")}
                      className={`relative flex h-full items-center gap-2 rounded-full px-4 transition-all ${paymentMode === "free_queue"
                        ? "text-textPrimary"
                        : "text-textMuted hover:text-textSecondary"
                        }`}
                    >
                      {paymentMode === "free_queue" && (
                        <motion.div
                          layoutId="pill-highlight"
                          className="absolute inset-0 rounded-full bg-elevated shadow-sm ring-1 ring-border/20"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Free {queueStatus ? `(${queueStatus.limit - queueStatus.used_today}/${queueStatus.limit})` : ""}
                        </span>
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
                    placeholder={paymentMode === "free_queue" ? "Describe the image you want to request (fulfilled manually)..." : "Describe the image you want to create..."}
                    rows={1}
                    disabled={generating}
                    className="block min-h-[46px] w-full resize-none rounded-card border border-border/60 bg-surface px-4 py-[11px] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(var(--color-primary),0.08)] transition-all disabled:opacity-50"
                  />
                  {paymentMode === "credits" && !generating && (
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
                  disabled={generating || !prompt.trim() || (paymentMode !== "free_queue" && !hasModels)}
                  className={`relative h-[46px] shrink-0 overflow-hidden rounded-card px-8 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${paymentMode === "credits"
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
                        <span>{paymentMode === "free_queue" ? "Request Image" : "Generate"}</span>
                        {paymentMode === "credits" && (
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
