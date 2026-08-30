import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImagePath, getProxyDownloadUrl, type GeneratedImage, type StudioPreset } from "../api/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage | StudioPreset | null;
  onApplyExpand?: (data: {
    expandedFile: File;
    expandedPreview: string;
    prompt: string;
    targetRatio: string;
    scale: number;
    offset: { x: number; y: number };
  }) => void;
};

const EXPANSION_RATIOS = [
  { id: "16:9", label: "16:9 Landscape", w: 16, h: 9 },
  { id: "9:16", label: "9:16 Portrait", w: 9, h: 16 },
  { id: "4:3", label: "4:3 Classic", w: 4, h: 3 },
  { id: "3:4", label: "3:4 Vertical", w: 3, h: 4 },
  { id: "1:1", label: "1:1 Square", w: 1, h: 1 },
  { id: "2:3", label: "2:3 Poster", w: 2, h: 3 },
  { id: "3:2", label: "3:2 Photo", w: 3, h: 2 },
];

const MAX_EXPANSION_LIMIT = 2.0; // 200% max expansion restriction
const MIN_EXPANSION = 1.0;

export default function ImageExpandModal({ isOpen, onClose, image, onApplyExpand }: Props) {
  const navigate = useNavigate();
  const [targetRatioId, setTargetRatioId] = useState<string>("16:9");
  const [scale, setScale] = useState<number>(1.4); // Canvas scale multiplier (1.0x to 2.0x)
  const [alignment, setAlignment] = useState<"center" | "left" | "right" | "top" | "bottom">("center");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (image) {
      const sourceRatio = (image as GeneratedImage).aspect_ratio || "1:1";
      if (sourceRatio === "1:1") {
        setTargetRatioId("16:9");
      } else if (sourceRatio === "16:9") {
        setTargetRatioId("1:1");
      } else {
        setTargetRatioId("16:9");
      }
      setScale(1.4);
      setAlignment("center");
      setCustomPrompt("");
    }
  }, [image]);

  if (!isOpen || !image || !image.image_url) return null;

  const currentRatio = EXPANSION_RATIOS.find((r) => r.id === targetRatioId) || EXPANSION_RATIOS[0];
  const sourceImageUrl = resolveImagePath(image.image_url);

  const sourceRatioStr = (image as GeneratedImage).aspect_ratio || "1:1";
  const ratioParts = sourceRatioStr.split(":").map(Number);
  const sourceAspect = ratioParts[0] && ratioParts[1] ? ratioParts[0] / ratioParts[1] : 1.0;
  const targetAspect = currentRatio.w / currentRatio.h;

  // Uncropped preview bounds
  let innerWidthPct: number;
  let innerHeightPct: number;
  if (targetAspect >= sourceAspect) {
    innerHeightPct = 100 / scale;
    innerWidthPct = (100 / scale) * (sourceAspect / targetAspect);
  } else {
    innerWidthPct = 100 / scale;
    innerHeightPct = (100 / scale) * (targetAspect / sourceAspect);
  }

  // Generate composite outpaint frame on HTML5 canvas and export File
  const handleProceed = async () => {
    setProcessing(true);
    try {
      const proxyUrl = getProxyDownloadUrl(image.image_url || "") || sourceImageUrl;
      const res = await fetch(proxyUrl);
      const blob = await res.blob();

      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const origW = img.naturalWidth || img.width || 1024;
      const origH = img.naturalHeight || img.height || 1024;
      const naturalAspect = origW / origH;

      // Expand outward around original image WITHOUT ANY CROPPING
      let canvasW: number;
      let canvasH: number;
      const drawW = origW;
      const drawH = origH;

      if (targetAspect >= naturalAspect) {
        canvasH = Math.round(origH * scale);
        canvasW = Math.round(canvasH * targetAspect);
      } else {
        canvasW = Math.round(origW * scale);
        canvasH = Math.round(canvasW / targetAspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context");

      // Fill transparent background
      ctx.clearRect(0, 0, canvasW, canvasH);

      // Compute uncropped alignment offsets
      let drawX = Math.round((canvasW - drawW) / 2);
      let drawY = Math.round((canvasH - drawH) / 2);

      if (alignment === "left") drawX = 0;
      if (alignment === "right") drawX = canvasW - drawW;
      if (alignment === "top") drawY = 0;
      if (alignment === "bottom") drawY = canvasH - drawH;

      // Draw original image with 100% full uncropped preservation
      ctx.drawImage(img, 0, 0, origW, origH, drawX, drawY, drawW, drawH);

      canvas.toBlob(async (canvasBlob) => {
        if (!canvasBlob) throw new Error("Canvas export failed");

        const expandedFile = new File([canvasBlob], `expanded-${Date.now()}.png`, { type: "image/png" });
        const expandedPreview = URL.createObjectURL(canvasBlob);

        const sourcePrompt = (image as GeneratedImage).prompt || (image as StudioPreset).title || "";
        const finalPrompt = customPrompt.trim()
          ? `Outpaint and seamlessly expand canvas around original uncropped image (${targetRatioId}, ${scale.toFixed(1)}x area). ${customPrompt.trim()}. Context: ${sourcePrompt}`
          : `Outpaint and extend background environment seamlessly to ${targetRatioId} aspect ratio (${scale.toFixed(1)}x canvas area). Preserve 100% original uncropped subject. Context: ${sourcePrompt}`;

        if (onApplyExpand) {
          onApplyExpand({
            expandedFile,
            expandedPreview,
            prompt: finalPrompt,
            targetRatio: targetRatioId,
            scale,
            offset: { x: drawX, y: drawY }
          });
          onClose();
        } else {
          onClose();
          navigate("/studio", {
            state: {
              task: "expand",
              taskName: "Expand Image (Outpaint)",
              presetPrompt: finalPrompt,
              aspectRatio: targetRatioId,
              provider: (image as GeneratedImage).provider,
              model: (image as GeneratedImage).model,
              referenceImageUrl: image.image_url,
              isEdit: true,
              autoGenerate: true,
            },
          });
        }
        setProcessing(false);
      }, "image/png");
    } catch (err) {
      console.error("Outpaint canvas generation failed:", err);
      setProcessing(false);
      onClose();
      navigate("/studio", {
        state: {
          task: "expand",
          taskName: "Expand Image",
          presetPrompt: `Outpaint canvas to ${targetRatioId} (${scale.toFixed(1)}x expansion). Context: ${(image as GeneratedImage).prompt || ""}`,
          aspectRatio: targetRatioId,
          referenceImageUrl: image.image_url,
          isEdit: true,
          autoGenerate: true,
        },
      });
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-[#0e0e11] p-4 sm:p-5 shadow-2xl my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(var(--color-primary),0.2)]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textPrimary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Interactive Canvas Outpaint
                </h3>
                <p className="text-[10px] text-textMuted">Expand on top of original image without cropping (100% subject preserved)</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-surface p-1.5 text-textMuted hover:text-textPrimary transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Interactive Outpaint Canvas Preview Box */}
          <div className="relative mb-4 flex items-center justify-center rounded-xl border border-border/40 bg-black/60 p-4 overflow-hidden min-h-[220px] max-h-[300px]">
            {/* Outer Canvas Representation */}
            <div
              className="relative flex items-center justify-center border-2 border-dashed border-primary/40 rounded-lg transition-all duration-300 shadow-[0_0_25px_rgba(var(--color-primary),0.05)] bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]"
              style={{
                aspectRatio: `${currentRatio.w} / ${currentRatio.h}`,
                width: currentRatio.w >= currentRatio.h ? "100%" : "auto",
                height: currentRatio.w < currentRatio.h ? "220px" : "auto",
                maxHeight: "220px",
                maxWidth: "100%",
              }}
            >
              {/* Outpaint Area Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] font-mono uppercase tracking-widest text-primary/30 font-bold select-none">
                  AI Outpaint Area • {targetRatioId}
                </span>
              </div>

              {/* Inner Original Image (100% Uncropped Preservation) */}
              <div
                className="relative overflow-hidden rounded border border-white/40 shadow-2xl transition-all duration-300 flex items-center justify-center bg-black/40"
                style={{
                  width: `${Math.min(100, Math.max(10, innerWidthPct))}%`,
                  height: `${Math.min(100, Math.max(10, innerHeightPct))}%`,
                  alignSelf: alignment === "top" ? "flex-start" : alignment === "bottom" ? "flex-end" : "center",
                  margin: alignment === "left" ? "0 auto 0 0" : alignment === "right" ? "0 0 0 auto" : "auto",
                }}
              >
                <img
                  src={sourceImageUrl}
                  alt="Original Uncropped Subject"
                  className="h-full w-full object-contain"
                />

                {/* Original Image Badge */}
                <div className="absolute left-1 top-1 rounded bg-black/85 px-1.5 py-0.5 text-[8px] font-bold text-textPrimary uppercase tracking-wider backdrop-blur-sm border border-white/10">
                  100% Uncropped Original
                </div>

                {/* Glow Border */}
                <div className="absolute inset-0 border border-primary/50 pointer-events-none" />
              </div>
            </div>

            {/* Expansion Stats Pill */}
            <div className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-mono text-primary border border-primary/25 backdrop-blur-md">
              Expansion: {scale.toFixed(2)}x ({Math.round((scale - 1) * 100)}% outpaint area)
            </div>
          </div>

          {/* Aspect Ratio Presets */}
          <div className="mb-3.5">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-textMuted">
              1. Target Aspect Ratio
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {EXPANSION_RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setTargetRatioId(r.id)}
                  className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all ${
                    targetRatioId === r.id
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-[0_0_10px_rgba(var(--color-primary),0.2)]"
                      : "border-border/40 bg-surface/40 text-textSecondary hover:border-border/70 hover:text-textPrimary"
                  }`}
                >
                  <span className="text-[11px] font-mono">{r.id}</span>
                  <span className="text-[8px] text-textMuted truncate">{r.label.split(" ")[1] || ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expansion Scale Slider (Constrained to Max Limit) */}
          <div className="mb-3.5 rounded-xl border border-border/30 bg-surface/30 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
                <span>2. Canvas Expansion Multiplier</span>
                <span className="text-[9px] text-amber-400 font-normal">(Max limit: {MAX_EXPANSION_LIMIT}x)</span>
              </label>
              <span className="text-xs font-mono font-bold text-primary">{scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={MIN_EXPANSION}
              max={MAX_EXPANSION_LIMIT}
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5 bg-surface rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-textMuted mt-1 font-mono">
              <span>1.0x (Original)</span>
              <span>1.5x</span>
              <span className="text-amber-400 font-bold">2.0x (Max Limit)</span>
            </div>
          </div>

          {/* Alignment Placement Selector */}
          <div className="mb-3.5">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-textMuted">
              3. Subject Placement in Canvas
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(["center", "left", "right", "top", "bottom"] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setAlignment(pos)}
                  className={`flex-1 rounded-lg border py-1 px-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    alignment === pos
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border/40 bg-surface/40 text-textSecondary hover:border-border/70"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Outpaint Description */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-textMuted">
              4. Optional: What should the AI paint into the expanded borders?
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., extend scenic background with sunset sky and coastal cliffs..."
              className="w-full rounded-input border border-border/50 bg-elevated px-3 py-2 text-xs text-textPrimary placeholder:text-textMuted focus:border-primary/50 focus:outline-none"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/20">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border/40 px-4 py-2 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={handleProceed}
              className="flex items-center gap-2 rounded-input bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-background shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:bg-primaryHover disabled:opacity-50 transition-all"
            >
              {processing ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  <span>Preparing Canvas...</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span>Expand Canvas ({targetRatioId})</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
