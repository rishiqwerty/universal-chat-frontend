import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ImageExpandModal from "./ImageExpandModal";
import { type GeneratedImage, type StudioPreset } from "../api/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage | StudioPreset;
  onSelectTask?: (task: "expand" | "remove_background" | "upscale" | "remix") => void;
};

export const TASK_PRESETS = {
  expand: {
    id: "expand",
    title: "Expand Image",
    subtitle: "Outpaint & extend canvas seamlessly",
    prompt: "Outpaint and expand the scene naturally beyond canvas boundaries, seamless texture extension, high fidelity",
    recommendedRatio: "16:9",
    tag: "Outpaint"
  },
  remove_background: {
    id: "remove_background",
    title: "Remove Background",
    subtitle: "Isolate foreground subject cleanly",
    prompt: "Isolate main subject, remove background, clean sharp silhouette edges, transparent studio backdrop",
    recommendedRatio: "1:1",
    tag: "Cutout"
  },
  upscale: {
    id: "upscale",
    title: "AI Upscale",
    subtitle: "Enhance resolution, sharpness & details",
    prompt: "Super resolution upscale 4k ultra high fidelity, enhance fine textures, remove compression noise, crisp sharpness",
    recommendedRatio: "1:1",
    tag: "HD Enhance"
  },
  remix: {
    id: "remix",
    title: "Remix with Prompt",
    subtitle: "Re-synthesize with custom instructions",
    prompt: "",
    recommendedRatio: "1:1",
    tag: "Custom"
  }
};

export default function ImageEditMenu({ isOpen, onClose, image, onSelectTask }: Props) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showExpandModal, setShowExpandModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExpandModal) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen && !showExpandModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, showExpandModal, onClose]);

  if (!isOpen) return null;

  if (showExpandModal) {
    return (
      <ImageExpandModal
        isOpen={true}
        onClose={() => {
          setShowExpandModal(false);
          onClose();
        }}
        image={image}
      />
    );
  }

  const handleTaskClick = (taskKey: "expand" | "remove_background" | "upscale" | "remix") => {
    if (taskKey === "expand") {
      setShowExpandModal(true);
      return;
    }

    onClose();
    if (onSelectTask) {
      onSelectTask(taskKey);
      return;
    }

    const preset = TASK_PRESETS[taskKey];
    const sourceRatio = (image as GeneratedImage).aspect_ratio || "1:1";
    let targetRatio = sourceRatio;

    const defaultPrompt = (image as GeneratedImage).prompt || (image as StudioPreset).title || "";
    const finalPrompt = taskKey === "remix"
      ? defaultPrompt
      : `${preset.prompt}. Subject context: ${defaultPrompt}`;

    navigate("/studio", {
      state: {
        task: taskKey,
        taskName: preset.title,
        presetPrompt: finalPrompt,
        aspectRatio: targetRatio,
        provider: (image as GeneratedImage).provider,
        model: (image as GeneratedImage).model,
        referenceImageUrl: image.image_url,
        isEdit: true,
      },
    });
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={menuRef}
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-[#0e0e11] p-4 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/20 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-textPrimary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Transform Image
                </h3>
                <p className="text-[10px] text-textMuted">Select an AI transformation tool</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-surface p-1 text-textMuted hover:text-textPrimary transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Task Options List */}
          <div className="flex flex-col gap-2">
            {/* 1. Expand Image (Outpaint) */}
            <button
              type="button"
              onClick={() => handleTaskClick("expand")}
              className="flex items-center gap-3 rounded-xl border border-border/30 bg-surface/50 p-2.5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary group-hover:text-primary transition-colors">
                    Expand Image
                  </span>
                  <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    Outpaint
                  </span>
                </div>
                <p className="text-[10px] text-textMuted truncate mt-0.5">
                  Extend canvas borders & scenery seamlessly
                </p>
              </div>
            </button>

            {/* 2. Remove Background */}
            <button
              type="button"
              onClick={() => handleTaskClick("remove_background")}
              className="flex items-center gap-3 rounded-xl border border-border/30 bg-surface/50 p-2.5 text-left hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48 8.528l-5.325-1.627a4.323 4.323 0 01-2.068-1.379z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary group-hover:text-rose-400 transition-colors">
                    Remove Background
                  </span>
                  <span className="text-[9px] font-bold uppercase text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    Cutout
                  </span>
                </div>
                <p className="text-[10px] text-textMuted truncate mt-0.5">
                  Isolate main subject with clean transparent backdrop
                </p>
              </div>
            </button>

            {/* 3. Upscale & Enhance */}
            <button
              type="button"
              onClick={() => handleTaskClick("upscale")}
              className="flex items-center gap-3 rounded-xl border border-border/30 bg-surface/50 p-2.5 text-left hover:border-sky-500/50 hover:bg-sky-500/5 transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary group-hover:text-sky-400 transition-colors">
                    AI Upscale
                  </span>
                  <span className="text-[9px] font-bold uppercase text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    Super Res
                  </span>
                </div>
                <p className="text-[10px] text-textMuted truncate mt-0.5">
                  Enhance 4K clarity, textures, and fine details
                </p>
              </div>
            </button>

            {/* 4. Remix / Custom Prompt */}
            <button
              type="button"
              onClick={() => handleTaskClick("remix")}
              className="flex items-center gap-3 rounded-xl border border-border/30 bg-surface/50 p-2.5 text-left hover:border-border/60 hover:bg-surface transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-textPrimary border border-white/10 group-hover:scale-105 transition-transform">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary group-hover:text-textPrimary transition-colors">
                    Remix with Prompt
                  </span>
                  <span className="text-[9px] font-bold uppercase text-textMuted bg-surface px-1.5 py-0.5 rounded border border-border/40">
                    Custom
                  </span>
                </div>
                <p className="text-[10px] text-textMuted truncate mt-0.5">
                  Modify prompt instructions & styling freely
                </p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Interactive Expand / Outpaint Canvas Modal */}
        <ImageExpandModal
          isOpen={showExpandModal}
          onClose={() => {
            setShowExpandModal(false);
            onClose();
          }}
          image={image}
        />
      </div>
    </AnimatePresence>
  );
}
