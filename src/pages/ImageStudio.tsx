import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import ConfirmModal from "../components/ConfirmModal";
import Topbar from "../components/Topbar";
import ImageLightbox from "../components/ImageLightbox";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import PageTransition from "../components/PageTransition";
import { getStudioPollingInterval } from "../config";
import {
  getStudioModels,
  generateStudioImage,
  getStudioGallery,
  getImageStatus,
  retryStudioImage,
  deleteStudioImage,
  resolveImagePath,
  getQueueStatus,
  getStudioPresets,
  type StudioModels,
  type GeneratedImage,
  type QueueStatus,
  type StudioPreset,
} from "../api/api";
import { useDocumentSEO } from "../hooks/useDocumentSEO";

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"];

export default function ImageStudio() {
  useDocumentSEO({
    title: "Studio",
    description: "Generate high-fidelity artistic renders and presets using neural models.",
  });

  const [models, setModels] = useState<StudioModels>({});
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [paymentMode, setPaymentMode] = useState<"own_key" | "credits" | "free_queue">("credits");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditSuggestion, setShowCreditSuggestion] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<StudioPreset | null>(null);
  const [dismissedPresetPrompt, setDismissedPresetPrompt] = useState(false);

  const [presets, setPresets] = useState<StudioPreset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Latest Deployed");
  const [activeTab, setActiveTab] = useState<"generations" | "presets">("generations");
  const [showOptions, setShowOptions] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imageIdToDelete, setImageIdToDelete] = useState<string | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState("");
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [loadingPresets, setLoadingPresets] = useState(true);

  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | StudioPreset | null>(null);
  const galleryEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoCloseTimerRef = useRef<any>(null);

  const scrollToLatestGeneration = useCallback(() => {
    setActiveTab("generations");
    requestAnimationFrame(() => {
      scrollAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      sliderRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    // Automatically close options panel after 3.5 seconds only on first load
    autoCloseTimerRef.current = setTimeout(() => {
      setShowOptions(false);
    }, 3500);

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);


  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [prompt]);

  // Reset dismissed prompt state when selected preset changes
  useEffect(() => {
    setDismissedPresetPrompt(false);
  }, [selectedPreset]);

  // Listen for clicks anywhere on the screen to dismiss the preset reference image prompt
  useEffect(() => {
    if (selectedPreset && !referenceImage && !dismissedPresetPrompt) {
      const handleOutsideClick = () => {
        setDismissedPresetPrompt(true);
      };

      const timer = setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
      }, 50);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleOutsideClick);
      };
    }
  }, [selectedPreset, referenceImage, dismissedPresetPrompt]);

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
    getStudioPresets()
      .then(setPresets)
      .catch(() => { })
      .finally(() => setLoadingPresets(false));
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
          window.dispatchEvent(new Event("balance-update"));

          // Automatically focus and scroll to the completed generation
          setActiveTab("generations");
          requestAnimationFrame(() => {
            scrollAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            sliderRef.current?.scrollTo({ left: 0, behavior: "smooth" });
          });
        }
      } catch {
        clearInterval(interval);
        pollingRef.current.delete(imageId);
      }
    }, getStudioPollingInterval() * 1000);

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
      .catch(() => { })
      .finally(() => setLoadingGallery(false));
  }, [pollForCompletion]);

  // Update model when provider changes
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (models[provider]?.length > 0) {
      setSelectedModel(models[provider][0]);
    }
  };

  const handleGenerate = async () => {
    const hasPrompt = prompt.trim() || selectedPreset;
    if (!hasPrompt || (paymentMode !== "free_queue" && (!selectedProvider || !selectedModel))) return;
    setGenerating(true);
    setError(null);

    try {
      // POST returns instantly with a pending/queued record
      const pendingImage = await generateStudioImage(
        prompt,
        paymentMode === "free_queue" ? "local" : selectedProvider,
        paymentMode === "free_queue" ? "system_default" : selectedModel,
        aspectRatio,
        paymentMode,
        referenceImage,
        selectedPreset?.id || null
      );
      // Add the pending/queued record to the gallery immediately
      setGallery((prev) => [pendingImage, ...prev]);
      setPrompt("");
      setSelectedPreset(null);
      setReferenceImage(null);
      setReferencePreview(null);
      setShowCreditSuggestion(false);
      setGenerating(false);

      // Switch tab to Recent Generations & scroll immediately to latest generation
      scrollToLatestGeneration();

      if (paymentMode === "free_queue") {
        // Refresh queue status
        getQueueStatus().then(setQueueStatus).catch(() => { });
      }

      // Always start polling for non-completed images
      pollForCompletion(pendingImage.id);

      // Dispatch balance update
      window.dispatchEvent(new Event("balance-update"));
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

  const handleRetry = async (imageId: string, paymentMode?: string) => {
    try {
      const updated = await retryStudioImage(imageId, paymentMode);
      // Update gallery state to 'pending' immediately
      setGallery((prev) =>
        prev.map((img) => (img.id === imageId ? updated : img))
      );
      // Resume polling
      pollForCompletion(imageId);
      // Switch tab and scroll to latest generation
      scrollToLatestGeneration();
      // Dispatch balance update
      window.dispatchEvent(new Event("balance-update"));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to retry generation.");
    }
  };

  const handleDelete = async (imageId: string) => {
    const targetImage = gallery.find((img) => img.id === imageId);
    if (targetImage && ["queued", "pending", "generating"].includes(targetImage.status)) {
      if (targetImage.payment_mode === "credits") {
        setDeleteConfirmMessage(
          "This is a premium credits-based generation in progress. If you cancel it, the 5 credits charged will NOT be refunded. Are you sure you want to delete and cancel this generation?"
        );
        setImageIdToDelete(imageId);
        setDeleteConfirmOpen(true);
        return;
      }
      if (targetImage.payment_mode === "own_key") {
        setDeleteConfirmMessage(
          "This is a personal API key generation in progress. Cancelling this request may not stop external billing charges already in progress with your API provider. Are you sure you want to delete and cancel this generation?"
        );
        setImageIdToDelete(imageId);
        setDeleteConfirmOpen(true);
        return;
      }
    }

    performDelete(imageId);
  };

  const performDelete = async (imageId: string) => {
    try {
      await deleteStudioImage(imageId);
      setGallery((prev) => prev.filter((img) => img.id !== imageId));
      if (lightboxImage?.id === imageId) setLightboxImage(null);
    } catch {
      // silent
    }
  };

  const handleRecreate = (preset: StudioPreset) => {
    setSelectedPreset(preset);
    setPrompt("");
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.scrollIntoView({ behavior: "smooth", block: "center" });
      textarea.focus();
    }
  };

  const renderGalleryCard = (img: GeneratedImage, isGridMode = false) => {
    return (
      <motion.div
        key={img.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`group relative cursor-pointer overflow-hidden rounded-card border bg-surface transition-all ${isGridMode ? "w-full aspect-square" : "w-[240px] flex-shrink-0 snap-start"
          } ${img.status === "failed"
            ? "border-red-500/30"
            : img.status === "completed"
              ? "border-border/30 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.06)]"
              : "border-border/20"
          }`}
        onClick={() => img.status === "completed" && setLightboxImage(img)}
      >
        {img.reference_image_url && (
          <div
            title="View reference image"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage({
                id: `${img.id}-ref`,
                prompt: `[Reference Image] ${img.prompt}`,
                image_url: img.reference_image_url,
                thumbnail_url: img.reference_image_thumbnail_url || img.reference_image_url,
                reference_image_url: null,
                reference_image_thumbnail_url: null,
                aspect_ratio: img.aspect_ratio,
                provider: img.provider,
                model: img.model,
                used_credits: "false",
                payment_mode: img.payment_mode,
                status: "completed",
                error_message: null,
                created_at: img.created_at
              });
            }}
            className="absolute left-2 top-2 z-20 h-10 w-10 overflow-hidden rounded border border-border/40 bg-surface shadow-md hover:border-primary transition-all cursor-zoom-in"
          >
            <img
              src={resolveImagePath(img.reference_image_thumbnail_url || img.reference_image_url)}
              alt="Reference"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="aspect-square overflow-hidden">
          {img.status === "completed" && img.image_url ? (
            <img
              src={resolveImagePath(img.thumbnail_url || img.image_url)}
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
              <div className="mt-3 flex flex-col gap-1.5 w-full items-center px-2 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry(img.id);
                  }}
                  className="rounded-full bg-red-500/85 hover:bg-red-500 px-4 py-1 text-[9px] font-bold uppercase tracking-widest text-white transition-all w-full"
                >
                  Try Again
                </motion.button>

                {img.payment_mode === "credits" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(img.id, "free_queue");
                    }}
                    className="text-[9px] font-bold text-red-300 hover:text-white transition-colors underline decoration-dotted mt-0.5"
                  >
                    Retry Free/Queue
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(img.id, "credits");
                    }}
                    className="text-[9px] font-bold text-primary hover:text-primaryHover transition-colors uppercase tracking-wider flex items-center justify-center gap-0.5 bg-primary/10 border border-primary/20 rounded-md py-0.5 w-full"
                  >
                    ⚡ Credits Retry (5c)
                  </button>
                )}
              </div>
            </div>
          ) : img.status === "queued" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-amber-500/[0.03] relative overflow-hidden">
              <div className="flex flex-col items-center gap-4 relative z-10 scale-75">
                <div className="relative h-16 w-20 flex items-center justify-center">
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

                  <div className="absolute bottom-0 h-8 w-16 border-b-2 border-x-2 border-amber-900/20 rounded-b-full bg-amber-500/5 overflow-hidden">
                    <svg className="absolute inset-0 h-full w-full text-amber-500/20" viewBox="0 0 20 10">
                      {[...Array(6)].map((_, i) => (
                        <motion.path
                          key={i}
                          d={`M ${2 + i * 2.5} 10 Q ${5 + i * 2.5} ${2 + (i % 2) * 3} ${8 + i * 2.5} 10`}
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                          animate={{
                            opacity: [0.3, 0.8, 0.3],
                            y: [0, -1, 0],
                          }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                        />
                      ))}
                    </svg>
                  </div>

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
            <div className="flex h-full w-full items-center justify-center bg-background relative overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1.1, 1.3, 1],
                  opacity: [0.1, 0.2, 0.15, 0.25, 0.1],
                  borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "50% 50% 20% 80% / 25% 80% 20% 75%", "30% 70% 70% 30% / 30% 30% 70% 70%"]
                }}
                transition={{ duration: 10, repeat: Infinity }}
                className="absolute inset-4 bg-primary blur-3xl"
              />

              <motion.div
                animate={{ y: ["-100%", "400%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-transparent via-primary/20 to-transparent z-10"
              />

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
                      borderStyle: i === 1 ? "dashed" : "solid"
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 relative z-20">
                <div className="relative">
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
    );
  };

  const renderSkeletonGrid = (count = 5, isGrid = false) => {
    const items = Array.from({ length: count });
    return (
      <div className={isGrid
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4"
        : "flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
      }>
        {items.map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className={`relative overflow-hidden rounded-card border border-border/20 bg-surface/40 p-1 flex-shrink-0 ${isGrid ? "w-full aspect-square" : "w-[240px] h-[240px]"
              }`}
          >
            <div className="relative h-full w-full rounded-[10px] overflow-hidden bg-elevated/40 flex items-center justify-center">
              {/* Shimmer animation */}
              <motion.div
                animate={{
                  x: ["-100%", "100%"]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
              />
              {/* Glowing loader */}
              <div className="flex flex-col items-center gap-2 relative z-20">
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center"
                >
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </motion.div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted/50 animate-pulse">Syncing...</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
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

  const filteredPresets = presets.filter((preset) => {
    const matchesCategory =
      selectedCategory === "All" ||
      (selectedCategory === "UI Components" && (preset.category.toLowerCase() === "ui components" || preset.category.toLowerCase() === "ui layout")) ||
      preset.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (preset.prompt ? preset.prompt.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const sortedPresets = [...filteredPresets].sort((a, b) => {
    if (sortBy === "A-Z") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <PageTransition>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar activeNav="studio" isAuthenticated={true} />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar
            hideIncognito={true}
            leftContent={
              <div className="flex flex-col justify-center select-none shrink-0 pr-2">
                <h1
                  className="text-base font-bold text-textPrimary leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Studio
                </h1>
                <p className="hidden sm:block mt-1.5 text-[11px] text-textMuted leading-none">
                  Generate images from text prompts
                </p>
              </div>
            }
          />

          {/* Scrollable Gallery Area */}
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 md:px-8 pb-36 md:pb-48 pt-0">
            <div ref={galleryEndRef} />

            {/* Tabs Selector */}
            <div className="sticky top-0 z-30 bg-background pt-6 pb-3 mb-6 flex gap-6 md:gap-8 border-b border-border/20">
              <button
                onClick={() => setActiveTab("generations")}
                className={`relative pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "generations" ? "text-primary" : "text-textMuted hover:text-textSecondary"
                  }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Recent Generations
                {activeTab === "generations" && (
                  <motion.div
                    layoutId="studio-active-tab"
                    className="absolute bottom-0 left-0 h-[2px] w-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("presets")}
                className={`relative pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === "presets" ? "text-primary" : "text-textMuted hover:text-textSecondary"
                  }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Preset Libraries
                {activeTab === "presets" && (
                  <motion.div
                    layoutId="studio-active-tab"
                    className="absolute bottom-0 left-0 h-[2px] w-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <AnimatePresence mode="wait">
              {activeTab === "generations" ? (
                <motion.div
                  key="generations-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Generating skeleton */}
                  {generating && (
                    <div className="mb-6 flex justify-center">
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

                  {loadingGallery ? (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h2
                          className="text-sm font-bold uppercase tracking-wider text-textSecondary"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          Recent Generations
                        </h2>
                      </div>
                      {renderSkeletonGrid(5, showFullGallery)}
                    </div>
                  ) : gallery.length > 0 ? (
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
                            {showFullGallery ? "Show Slider" : `View All (${gallery.length})`}
                          </button>
                        )}
                      </div>

                      {showFullGallery ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4">
                          <AnimatePresence>
                            {gallery.map((img) => renderGalleryCard(img, true))}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div
                          ref={sliderRef}
                          onScroll={handleScroll}
                          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
                        >
                          <AnimatePresence>
                            {displayedGallery.map((img) => renderGalleryCard(img, false))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty State */
                    !generating && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
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
                </motion.div>
              ) : (
                <motion.div
                  key="presets-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="pb-8"
                >
                  {/* Preset Libraries */}
                  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2
                        className="text-2xl font-black uppercase tracking-tight text-textPrimary"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        Preset <span className="text-primary">Libraries</span>
                      </h2>
                      <p className="mt-2 text-xs text-textMuted max-w-xl leading-relaxed">
                        High-fidelity neural weights and prompt matrices ready for recreation. Inject these parameters into your active workspace.
                      </p>
                    </div>

                    {/* Search input */}
                    <div className="relative w-full max-w-xs">
                      <svg className="absolute left-3 top-2.5 h-4 w-4 text-textMuted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search presets..."
                        className="h-9 w-full rounded-input border border-border/60 bg-surface pl-9 pr-4 text-xs text-textPrimary placeholder-textMuted outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Filters & Sorting */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      {["All", "Architecture", "Portrait", "Abstract", "Landscape", "UI Components", "Industrial", "Texture"].map((cat) => {
                        const isActive = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${isActive
                                ? "bg-primary text-background shadow-md shadow-primary/10"
                                : "bg-surface-elevated border border-border/40 text-textMuted hover:text-textSecondary hover:bg-surface"
                              }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                      <span>Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-textPrimary cursor-pointer outline-none hover:text-primary transition-colors border-none py-1 pl-1 pr-4"
                      >
                        <option value="Latest Deployed" className="bg-surface text-textPrimary">Latest Deployed</option>
                        <option value="A-Z" className="bg-surface text-textPrimary">A-Z</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid */}
                  {loadingPresets ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={`preset-skeleton-${i}`}
                          className="relative aspect-square overflow-hidden rounded-card border border-border/20 bg-surface/40 p-1"
                        >
                          <div className="relative h-full w-full rounded-[10px] overflow-hidden bg-elevated/40 flex items-center justify-center">
                            <motion.div
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
                            />
                            <div className="flex flex-col items-center gap-2 relative z-20">
                              <motion.div
                                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center"
                              >
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              </motion.div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted/50 animate-pulse">Syncing...</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sortedPresets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {sortedPresets.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => setLightboxImage(preset)}
                          className="group relative aspect-square cursor-pointer rounded-card border border-border/30 bg-surface overflow-hidden hover:border-primary/20 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.04)] transition-all"
                        >
                          {preset.before_image_url ? (
                            <BeforeAfterSlider
                              beforeImage={resolveImagePath(preset.before_image_url)}
                              afterImage={resolveImagePath(preset.thumbnail_url || preset.image_url)}
                              altTitle={preset.title}
                            />
                          ) : (
                            <img
                              src={resolveImagePath(preset.thumbnail_url || preset.image_url)}
                              alt={preset.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute left-3 top-3 rounded bg-background/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20 backdrop-blur-sm z-10">
                            {preset.category}
                          </div>

                          {/* Hover Overlay with Recreate option */}
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecreate(preset);
                              }}
                              className="w-full rounded-input bg-primary py-2 text-[10px] font-black uppercase tracking-wider text-background shadow-lg shadow-primary/20 transition-all hover:bg-primaryHover active:scale-[0.98]"
                            >
                              Recreate ⚡
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <svg className="mb-3 h-8 w-8 text-textMuted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-textMuted">No presets found matching your filters.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Input Bar — floating glass window */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-4xl z-20 rounded-2xl border border-white/10 bg-sidebar/40 backdrop-blur-xl px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
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

            <div className="flex w-full flex-col gap-3">
              {/* Settings Drawer (Animated Height & Opacity) */}
              <AnimatePresence initial={false}>
                {showOptions && (
                  <motion.div
                    key="settings-options-drawer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 pb-2">
                      {/* Top row: controls */}
                      <div className="flex flex-wrap items-end gap-3">
                        {/* Provider & Model */}
                        {paymentMode !== "free_queue" && (
                          hasModels ? (
                            <>
                              <div className="w-full sm:w-auto min-w-[120px] flex-1 sm:flex-initial">
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
                              <div className="w-full sm:w-auto min-w-[160px] flex-1 sm:flex-initial">
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
                            <div className="h-9 flex items-center rounded-input border border-border/40 bg-surface/50 px-3 text-xs text-textMuted w-full sm:w-auto">
                              No image models found.{" "}
                              <a href="/settings" className="ml-1 text-primary underline">Add a key</a>.
                            </div>
                          )
                        )}

                        <div className="w-full sm:w-auto min-w-[110px] flex-1 sm:flex-initial">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Aspect Ratio</label>
                          <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="h-9 w-full rounded-input border border-border/60 bg-surface px-2.5 text-xs text-textPrimary outline-none focus:border-primary/50 transition-colors cursor-pointer"
                          >
                            {ASPECT_RATIOS.map((ar) => (
                              <option key={ar} value={ar}>{ar}</option>
                            ))}
                          </select>
                        </div>

                        {/* Pill Shaped Switcher */}
                        <div className="w-full sm:w-auto flex-1 sm:flex-initial">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-textMuted">Payment</label>
                          <div className="flex h-9 w-full sm:w-auto items-center rounded-full border border-border/40 bg-surface/40 p-1">
                            <button
                              onClick={() => setPaymentMode("own_key")}
                              className={`relative flex-1 sm:flex-initial flex h-full items-center justify-center gap-2 rounded-full px-4 transition-all ${paymentMode === "own_key"
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
                              className={`relative flex-1 sm:flex-initial flex h-full items-center justify-center gap-2 rounded-full px-4 transition-all ${paymentMode === "credits"
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
                              className={`relative flex-1 sm:flex-initial flex h-full items-center justify-center gap-2 rounded-full px-4 transition-all ${paymentMode === "free_queue"
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
                                  Free {queueStatus ? `(${Math.max(0, queueStatus.limit - queueStatus.used_today)}/${queueStatus.limit})` : ""}
                                </span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Payment Mode Info/Description */}
                      <div className="mb-3 text-[11px] leading-relaxed text-textSecondary bg-surface/30 rounded-lg p-3 border border-border/20 flex flex-col gap-1.5">
                        {paymentMode === "own_key" && (
                          <div>
                            <span className="font-semibold text-textPrimary">Personal API Key:</span> Generates images instantly using your own configured keys in Settings. No credits consumed.
                          </div>
                        )}
                        {paymentMode === "credits" && (
                          <div>
                            <span className="font-semibold text-primary">⚡ Instant Generation (5 Credits):</span> High-priority, premium generation with dedicated resources. Images start synthesizing immediately without queue delays.
                          </div>
                        )}
                        {paymentMode === "free_queue" && (
                          <div className="flex flex-col gap-1">
                            <div>
                              <span className="font-semibold text-textPrimary">⏳ Standard Queue (Free / 2 Credits):</span> Background-priority queue generation. Images are queued and processed using system default models.
                            </div>
                            <div className="text-[10px] text-textMuted border-t border-border/10 pt-1 mt-1">
                              Free for first <strong className="text-textPrimary">{queueStatus?.limit || 3} generations/week</strong>, then costs <strong className="text-textPrimary">2 credits</strong> per generation.
                            </div>
                          </div>
                        )}
                      </div>

                      {paymentMode === "free_queue" && queueStatus && queueStatus.used_today >= queueStatus.limit && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-2 text-[10px] text-amber-500/90 leading-normal px-1"
                        >
                          ⚠️ Weekly free limit reached ({queueStatus.used_today}/{queueStatus.limit}). Want immediate processing? <button type="button" onClick={() => setPaymentMode("credits")} className="font-bold underline text-amber-400 hover:text-amber-300 transition-colors">Switch to Instant Generation</button> (⚡ 5 Credits).
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt Input Card Container (Mobile Friendly) */}
              <div className="flex w-full flex-col rounded-xl border border-border/60 bg-surface focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(var(--color-primary),0.08)] transition-all overflow-hidden p-2">
                {/* Reference Image Preview inside the box */}
                {referencePreview && (
                  <div className="px-3 pt-2">
                    <div
                      title="View uploaded image"
                      onClick={() => {
                        setLightboxImage({
                          id: "input-ref",
                          prompt: "Uploaded Reference Image",
                          image_url: referencePreview,
                          reference_image_url: null,
                          aspect_ratio: aspectRatio,
                          provider: selectedProvider || "Local",
                          model: selectedModel || "File",
                          used_credits: "false",
                          payment_mode: paymentMode,
                          status: "completed",
                          error_message: null,
                          created_at: new Date().toISOString()
                        });
                      }}
                      className="relative h-14 w-14 cursor-pointer rounded-lg border border-border/40 overflow-hidden bg-surface hover:border-primary/50 transition-colors group"
                    >
                      <img src={referencePreview} alt="Reference Preview" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReferenceImage(null);
                          setReferencePreview(null);
                        }}
                        className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-textMuted hover:text-red-500 shadow-md backdrop-blur-sm transition-all"
                      >
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Preset Badge */}
                {selectedPreset && (
                  <div className="px-3 pt-2 pb-1 flex flex-col border-b border-border/10 mb-2 gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded animate-pulse">
                          Preset Active
                        </span>
                        <span className="text-xs font-semibold text-textPrimary">
                          {selectedPreset.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreset(null);
                        }}
                        className="text-textMuted hover:text-red-400 transition-colors"
                        title="Clear preset selection"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {!referenceImage && !dismissedPresetPrompt && (
                      <div className="text-[10px] text-primary/95 flex items-center gap-1.5 animate-pulse font-medium pb-1">
                        <span>📸 Optionally upload a reference image below to customize this preset style.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Textarea Row */}
                <div className="relative w-full">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !generating) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder={
                      selectedPreset
                        ? "Type additional instructions to customize this preset style..."
                        : paymentMode === "free_queue"
                          ? "Describe the image you want to request..."
                          : "Describe the image you want to create..."
                    }
                    rows={1}
                    disabled={generating}
                    className="block min-h-[46px] max-h-[160px] overflow-y-auto w-full resize-none bg-transparent px-3 py-2.5 text-sm text-textPrimary placeholder-textMuted outline-none disabled:opacity-50"
                  />
                </div>

                {/* Toolbar Row */}
                <div className="flex items-center justify-between border-t border-border/20 pt-2 px-1">
                  <div className="flex items-center gap-1.5">
                    {/* Settings toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (autoCloseTimerRef.current) {
                          clearTimeout(autoCloseTimerRef.current);
                          autoCloseTimerRef.current = null;
                        }
                        setShowOptions(!showOptions);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${showOptions
                          ? "border-primary/50 text-primary bg-primary/10"
                          : "border-border/30 bg-surface-elevated text-textMuted hover:text-primary hover:border-primary/50"
                        }`}
                      title="Toggle Options"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>

                    {/* Upload Image Button with Tooltip guide */}
                    <div className="relative">
                      <label
                        title="Upload image"
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all disabled:opacity-50 ${selectedPreset && !referenceImage && !dismissedPresetPrompt
                            ? "border-primary text-primary bg-primary/5 shadow-[0_0_12px_rgba(var(--color-primary),0.25)] ring-1 ring-primary animate-pulse"
                            : "border-border/30 bg-surface-elevated text-textMuted hover:border-primary/50 hover:text-primary"
                          }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={generating}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReferenceImage(file);
                              setReferencePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                        </svg>
                      </label>

                      {/* Floating Tooltip */}
                      <AnimatePresence>
                        {selectedPreset && !referenceImage && !dismissedPresetPrompt && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 w-52 p-2.5 rounded-xl border border-primary/20 bg-[#0d0d0f]/95 text-[11px] text-textSecondary text-center shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md pointer-events-none"
                          >
                            <span className="font-bold text-primary block mb-0.5">📸 Style Preset Active</span>
                            Optionally upload a reference image to transfer this style.
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary/20" />
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#0d0d0f]" style={{ marginTop: '-1px' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Selected payment indicator when options are minimized */}
                    {!showOptions && !generating && (
                      <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-textSecondary bg-surface-elevated px-2.5 h-8 rounded-lg border border-border/30">
                        {paymentMode === "own_key" && "🔑 Personal"}
                        {paymentMode === "credits" && "⚡ Credits (5c)"}
                        {paymentMode === "free_queue" && (
                          queueStatus && queueStatus.used_today >= queueStatus.limit
                            ? "⏳ Queue (2c)"
                            : "⏳ Free Queue"
                        )}
                      </span>
                    )}

                    {/* Credits Counter or Details in toolbar */}
                    {paymentMode === "credits" && !generating && showOptions && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        ⚡ 5 Credits
                      </span>
                    )}
                    {paymentMode === "free_queue" && queueStatus && queueStatus.used_today >= queueStatus.limit && !generating && showOptions && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                        ⚡ 2 Credits Charge
                      </span>
                    )}
                  </div>

                  {/* Generate Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    onClick={handleGenerate}
                    disabled={generating || (!prompt.trim() && !selectedPreset) || (paymentMode !== "free_queue" && !hasModels)}
                    className={`relative h-8 overflow-hidden rounded-lg px-4 text-xs font-bold framer-btn disabled:opacity-40 disabled:cursor-not-allowed ${paymentMode === "credits"
                      ? "bg-primary text-background shadow-[0_0_12px_rgba(var(--color-primary),0.2)]"
                      : "bg-surface-elevated border border-border/40 text-textPrimary hover:border-primary/50"
                      }`}
                  >
                    <div className="relative z-10 flex items-center gap-1.5">
                      {generating ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          <span>Architecting...</span>
                        </>
                      ) : (
                        <>
                          <span>{paymentMode === "free_queue" ? "Request" : "Generate"}</span>
                          {paymentMode === "credits" && (
                            <span className="flex items-center gap-0.5 pl-1 ml-1 border-l border-background/20">
                              <span className="text-[9px] font-black">⚡ 5</span>
                            </span>
                          )}
                          {paymentMode === "free_queue" && queueStatus && queueStatus.used_today >= queueStatus.limit && (
                            <span className="flex items-center gap-0.5 pl-1 ml-1 border-l border-border/20">
                              <span className="text-[9px] font-bold text-amber-500">⚡ 2</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox */}
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
          onDelete={lightboxImage?.id?.endsWith("-ref") ? undefined : (id) => {
            handleDelete(id);
            setLightboxImage(null);
          }}
          onRecreate={handleRecreate}
        />

        <ConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setImageIdToDelete(null);
          }}
          onConfirm={() => {
            if (imageIdToDelete) {
              performDelete(imageIdToDelete);
            }
          }}
          title="Cancel Generation"
          message={deleteConfirmMessage}
          confirmText="Yes, Cancel"
        />
      </div>
    </PageTransition>
  );
}
