import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ConfirmModal from "../components/ConfirmModal";
import PageTransition from "../components/PageTransition";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { useAuth } from "../context/AuthContext";
import { 
  getStudioGallery, 
  deleteStudioImage, 
  resolveImagePath, 
  getProxyDownloadUrl, 
  type GeneratedImage 
} from "../api/api";

const ASPECT_RATIOS = ["All", "1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"];
const INITIAL_BATCH_SIZE = 24;
const LOAD_MORE_STEP = 20;

export default function Library() {
  useDocumentSEO({
    title: "Image Library",
    description: "Manage, filter, inspect, reuse prompts, and download all your generated images in one place.",
  });

  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("All");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Infinite scroll progressive loading count
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<GeneratedImage | null>(null);

  const fetchGallery = useCallback(() => {
    if (!isAuthenticated) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getStudioGallery(300, 0)
      .then((data) => {
        const completedOnly = (data || []).filter(
          (img) => img.status === "completed" && Boolean(img.image_url)
        );
        setImages(completedOnly);
      })
      .catch((err) => console.error("Failed to load image library", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    const handleLogout = () => {
      setImages([]);
      setLightboxImage(null);
    };
    window.addEventListener("app:user-logged-out", handleLogout);
    return () => window.removeEventListener("app:user-logged-out", handleLogout);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGallery();
    } else {
      setImages([]);
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, fetchGallery]);

  // Extract unique providers for filter
  const availableProviders = useMemo(() => {
    const providers = new Set<string>();
    images.forEach((img) => {
      if (img.provider) providers.add(img.provider);
    });
    return ["All", ...Array.from(providers)];
  }, [images]);

  // Filter and sort completed images
  const filteredImages = useMemo(() => {
    return images
      .filter((img) => img.status === "completed" && Boolean(img.image_url))
      .filter((img) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesPrompt = img.prompt?.toLowerCase().includes(q);
          const matchesModel = img.model?.toLowerCase().includes(q);
          const matchesProvider = img.provider?.toLowerCase().includes(q);
          if (!matchesPrompt && !matchesModel && !matchesProvider) return false;
        }

        // Aspect ratio filter
        if (selectedAspectRatio !== "All" && img.aspect_ratio !== selectedAspectRatio) {
          return false;
        }

        // Provider filter
        if (selectedProvider !== "All" && img.provider !== selectedProvider) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortBy === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [images, searchQuery, selectedAspectRatio, selectedProvider, sortBy]);

  // Reset visible count when filter criteria change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedAspectRatio, selectedProvider, sortBy]);

  // Visible sliced images for high-performance rendering
  const visibleImages = useMemo(() => {
    return filteredImages.slice(0, visibleCount);
  }, [filteredImages, visibleCount]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredImages.length) {
              return Math.min(prev + LOAD_MORE_STEP, filteredImages.length);
            }
            return prev;
          });
        }
      },
      {
        root: mainScrollRef.current,
        rootMargin: "300px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredImages.length, visibleCount]);

  // Fallback scroll listener
  const handleScroll = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      setVisibleCount((prev) => {
        if (prev < filteredImages.length) {
          return Math.min(prev + LOAD_MORE_STEP, filteredImages.length);
        }
        return prev;
      });
    }
  }, [filteredImages.length]);

  // Copy prompt handler
  const handleCopyPrompt = (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!img.prompt) return;
    navigator.clipboard.writeText(img.prompt);
    setCopiedPromptId(img.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Open in Studio handler
  const handleOpenInStudio = (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate("/studio", {
      state: {
        presetPrompt: img.prompt,
        aspectRatio: img.aspect_ratio,
        provider: img.provider,
        model: img.model,
      },
    });
  };

  // Download image handler
  const handleDownload = async (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!img.image_url) return;
    const downloadUrl = getProxyDownloadUrl(img.image_url) || resolveImagePath(img.image_url);
    try {
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `neural-architect-${img.id.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(downloadUrl, "_blank");
    }
  };

  // Delete image confirmation
  const handleDeleteClick = (img: GeneratedImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageToDelete(img);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!imageToDelete) return;
    try {
      await deleteStudioImage(imageToDelete.id);
      setImages((prev) => prev.filter((i) => i.id !== imageToDelete.id));
      if (lightboxImage?.id === imageToDelete.id) {
        setLightboxImage(null);
      }
    } catch (err) {
      console.error("Failed to delete image", err);
    } finally {
      setImageToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="library" />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar
            hideIncognito={true}
            leftContent={
              <div className="flex items-center gap-3 select-none shrink-0 pr-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(var(--color-primary),0.15)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="flex flex-col justify-center">
                  <h1
                    className="text-base font-bold text-textPrimary leading-none font-headline"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Image Library
                  </h1>
                  <p className="hidden sm:block mt-1 text-[11px] text-textMuted leading-none">
                    All your synthesized neural artworks in one place
                  </p>
                </div>
              </div>
            }
          />

          <main 
            ref={mainScrollRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar"
          >
            {/* Quick Stats Bar & Action */}
            <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                <div className="rounded-xl border border-border/40 bg-surface/40 p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted">Completed Images</p>
                  <p className="mt-0.5 text-xl font-bold text-textPrimary">{images.length}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/40 p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Matching Filters</p>
                  <p className="mt-0.5 text-xl font-bold text-textPrimary">{filteredImages.length}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/40 p-3 backdrop-blur-sm col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Providers Used</p>
                  <p className="mt-0.5 text-xl font-bold text-textPrimary">{availableProviders.filter((p) => p !== "All").length}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => navigate("/studio")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-input bg-primary px-4 py-2.5 text-xs font-bold text-background shadow-[0_0_15px_rgba(var(--color-primary),0.25)] transition-all hover:bg-primaryHover hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Generation</span>
                </button>
              </div>
            </div>

            {/* Filters and Search Toolbar */}
            <div className="mb-6 flex flex-col md:flex-row gap-3 rounded-2xl border border-border/40 bg-surface/30 p-3.5 backdrop-blur-md">
              {/* Search input */}
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, models, or providers..."
                  className="h-10 w-full rounded-input border border-border/50 bg-elevated/70 py-2 pl-9 pr-3 text-sm text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Aspect Ratio Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-textMuted mr-1 shrink-0">Ratio:</span>
                {ASPECT_RATIOS.slice(0, 5).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setSelectedAspectRatio(ratio)}
                    className={`shrink-0 rounded-input px-2.5 py-1 text-xs font-semibold transition-all ${
                      selectedAspectRatio === ratio
                        ? "bg-primary text-background shadow-[0_0_10px_rgba(var(--color-primary),0.3)]"
                        : "bg-elevated/60 text-textSecondary hover:bg-elevated hover:text-textPrimary border border-border/30"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              {/* Provider & Sort Selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="h-10 rounded-input border border-border/50 bg-elevated/70 px-3 text-xs font-medium text-textPrimary focus:border-primary/50 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Providers</option>
                  {availableProviders.filter((p) => p !== "All").map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                  className="flex h-10 items-center gap-1.5 rounded-input border border-border/50 bg-elevated/70 px-3 text-xs font-semibold text-textSecondary hover:bg-elevated hover:text-textPrimary transition-colors"
                  title="Toggle sort direction"
                >
                  <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M6 12h12m-9 6h6" />
                  </svg>
                  <span>{sortBy === "newest" ? "Newest" : "Oldest"}</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div 
                    key={`skeleton-${idx}`}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-border/30 bg-surface/40 backdrop-blur-md"
                  >
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    />
                  </div>
                ))}
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-border/30 bg-surface/20 p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-border/50 text-textMuted mb-4">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h3 
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-lg font-headline font-bold text-textPrimary"
                >
                  {images.length === 0 ? "No images generated yet" : "No images match your filter"}
                </h3>
                <p className="mt-1 max-w-sm text-xs sm:text-sm text-textSecondary leading-relaxed">
                  {images.length === 0 
                    ? "Head over to the Studio to generate high-fidelity artistic renders using state-of-the-art neural diffusion models."
                    : "Try adjusting your search terms, aspect ratio, or provider filter to view your creations."
                  }
                </p>
                {images.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate("/studio")}
                    className="mt-6 rounded-input bg-primary px-5 py-2.5 text-xs font-bold text-background shadow-[0_0_16px_rgba(var(--color-primary),0.25)] hover:bg-primaryHover transition-all"
                  >
                    Open Studio
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedAspectRatio("All");
                      setSelectedProvider("All");
                    }}
                    className="mt-4 text-xs font-semibold text-primary hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <motion.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                >
                  {visibleImages.map((img) => (
                    <motion.div
                      layout
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-surface/50 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_25px_rgba(var(--color-primary),0.15)] flex flex-col"
                    >
                      {/* Image Container with aspect ratio */}
                      <div 
                        onClick={() => setLightboxImage(img)}
                        className="relative w-full overflow-hidden bg-black/60 cursor-pointer flex items-center justify-center"
                        style={{
                          aspectRatio: img.aspect_ratio === "16:9" ? "16/9"
                            : img.aspect_ratio === "9:16" ? "9/16"
                            : img.aspect_ratio === "4:3" ? "4/3"
                            : img.aspect_ratio === "3:4" ? "3/4"
                            : img.aspect_ratio === "3:2" ? "3/2"
                            : img.aspect_ratio === "2:3" ? "2/3"
                            : "1/1",
                          maxHeight: "360px"
                        }}
                      >
                        <img
                          src={resolveImagePath(img.thumbnail_url || img.image_url || "")}
                          alt={img.prompt || "Generated image"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                          }}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <span className="rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10 shadow-sm">
                            {img.aspect_ratio || "1:1"}
                          </span>
                          
                          {img.payment_mode === "credits" ? (
                            <span className="rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-black backdrop-blur-md shadow-sm">
                              ⚡ 5c
                            </span>
                          ) : img.payment_mode === "own_key" ? (
                            <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-textSecondary backdrop-blur-md border border-white/10">
                              🔑 BYOK
                            </span>
                          ) : null}
                        </div>

                        {/* Hover Overlay with Quick Action Buttons */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none">
                          <div className="flex items-center justify-between pointer-events-auto">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleCopyPrompt(img, e)}
                                className="rounded-lg bg-black/70 p-2 text-white hover:bg-primary hover:text-black transition-colors backdrop-blur-md border border-white/10"
                                title="Copy prompt"
                              >
                                {copiedPromptId === img.id ? (
                                  <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                  </svg>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenInStudio(img, e)}
                                className="rounded-lg bg-black/70 p-2 text-white hover:bg-primary hover:text-black transition-colors backdrop-blur-md border border-white/10"
                                title="Open in Studio"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </button>

                              {img.image_url && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownload(img, e)}
                                  className="rounded-lg bg-black/70 p-2 text-white hover:bg-primary hover:text-black transition-colors backdrop-blur-md border border-white/10"
                                  title="Download image"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(img, e)}
                              className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500 hover:text-white transition-colors backdrop-blur-md border border-red-500/30"
                              title="Delete image"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Metadata & Prompt Snippet */}
                      <div className="p-3 flex flex-col flex-1 justify-between bg-surface/30">
                        <p 
                          onClick={() => setLightboxImage(img)}
                          className="text-xs text-textSecondary line-clamp-2 leading-relaxed hover:text-textPrimary cursor-pointer transition-colors"
                          title={img.prompt}
                        >
                          {img.prompt || "No prompt recorded"}
                        </p>
                        
                        <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2 text-[10px] text-textMuted font-medium">
                          <span className="truncate max-w-[110px]" title={`${img.provider} • ${img.model}`}>
                            {img.model ? img.model.split("/").pop() : img.provider}
                          </span>
                          <span className="shrink-0">
                            {new Date(img.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Infinite Scroll Sentinel & Status Indicator */}
                {visibleCount < filteredImages.length ? (
                  <div ref={sentinelRef} className="py-10 flex flex-col items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent"
                    />
                    <p className="text-xs font-semibold text-textSecondary">
                      Loading more creations ({visibleImages.length} of {filteredImages.length})...
                    </p>
                  </div>
                ) : (
                  <div className="py-12 flex items-center justify-center gap-3 text-xs font-medium text-textMuted select-none">
                    <span className="h-[1px] w-12 bg-border/40" />
                    <span>All {filteredImages.length} creations loaded</span>
                    <span className="h-[1px] w-12 bg-border/40" />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Lightbox / Image Detail Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImage(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 flex flex-col lg:flex-row max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-elevated/95 shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            >
              {/* Top gradient highlight */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-textMuted transition-all hover:bg-surface hover:text-textPrimary backdrop-blur-md"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Left Image View */}
              <div className="relative flex flex-1 items-center justify-center bg-black/60 p-4 min-h-[300px] lg:min-h-[500px]">
                {lightboxImage.image_url ? (
                  <img
                    src={resolveImagePath(lightboxImage.image_url)}
                    alt={lightboxImage.prompt}
                    className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : (
                  <div className="text-center text-textMuted">
                    <p>Image not available</p>
                  </div>
                )}
              </div>

              {/* Right Detail Panel */}
              <div className="w-full lg:w-[360px] flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border/40 bg-background/50 p-6">
                <div className="space-y-4 overflow-y-auto max-h-[40vh] lg:max-h-[60vh] pr-1 custom-scrollbar">
                  <div>
                    <h3 
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      className="text-lg font-headline font-bold text-textPrimary"
                    >
                      Prompt
                    </h3>
                    <div className="mt-2 relative rounded-xl border border-border/40 bg-surface/60 p-3.5 text-xs text-textSecondary leading-relaxed">
                      {lightboxImage.prompt || "No prompt recorded"}
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(lightboxImage)}
                        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                      >
                        {copiedPromptId === lightboxImage.id ? "✓ Copied to clipboard" : "Copy Prompt Text"}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-border/20 py-1.5">
                      <span className="text-textMuted">Model</span>
                      <span className="font-semibold text-textPrimary truncate max-w-[180px]">{lightboxImage.model}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/20 py-1.5">
                      <span className="text-textMuted">Provider</span>
                      <span className="font-semibold text-textPrimary uppercase">{lightboxImage.provider}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/20 py-1.5">
                      <span className="text-textMuted">Aspect Ratio</span>
                      <span className="font-semibold text-textPrimary">{lightboxImage.aspect_ratio}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/20 py-1.5">
                      <span className="text-textMuted">Payment Mode</span>
                      <span className="font-semibold text-primary">
                        {lightboxImage.payment_mode === "credits" ? "⚡ Credits (5c)" : "🔑 Personal Key"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/20 py-1.5">
                      <span className="text-textMuted">Date Created</span>
                      <span className="font-semibold text-textPrimary">
                        {new Date(lightboxImage.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lightbox Action Buttons */}
                <div className="mt-6 flex flex-col gap-2 border-t border-border/30 pt-4">
                  <button
                    type="button"
                    onClick={() => handleOpenInStudio(lightboxImage)}
                    className="flex w-full items-center justify-center gap-2 rounded-input bg-primary py-2.5 text-xs font-bold text-background shadow-[0_0_15px_rgba(var(--color-primary),0.25)] transition-all hover:bg-primaryHover hover:scale-[1.01]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Reuse & Iterate in Studio</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {lightboxImage.image_url && (
                      <button
                        type="button"
                        onClick={() => handleDownload(lightboxImage)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-input border border-border/50 bg-surface py-2 text-xs font-semibold text-textPrimary hover:bg-elevated transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        <span>Download</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(lightboxImage)}
                      className="rounded-input border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete Image"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setImageToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Image"
        message="Are you sure you want to permanently delete this image from your library? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </PageTransition>
  );
}
