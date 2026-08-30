import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImagePath, getProxyDownloadUrl } from "../api/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt: string;
  title?: string;
};

export default function SocialShareModal({ isOpen, onClose, imageUrl, prompt, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const fullImageUrl = resolveImagePath(imageUrl);
  const shareText = `Synthesized with Neural Architect:\n"${prompt.slice(0, 150)}${prompt.length > 150 ? "..." : ""}"`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullImageUrl);
    setCopied(true);
    showToast("Link copied to clipboard! ✨");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n\n${fullImageUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`Synthesized with @NeuralArchitect AI:\n"${prompt.slice(0, 140)}"`);
    const url = encodeURIComponent(fullImageUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleInstagram = async () => {
    // Try native share API with actual image file if supported (iOS / Android opens Instagram directly)
    if (navigator.canShare) {
      try {
        const downloadUrl = getProxyDownloadUrl(imageUrl) || fullImageUrl;
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        const file = new File([blob], "neural-architect.png", { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Neural Architect Creation",
            text: shareText
          });
          return;
        }
      } catch {
        // Continue to fallback
      }
    }

    // Fallback for desktop: Copy link and guide user
    navigator.clipboard.writeText(fullImageUrl);
    showToast("Image link copied! Ready to post on Instagram 📸");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Neural Architect Image",
          text: shareText,
          url: fullImageUrl
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-[#0e0e11] p-5 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/20">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textPrimary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Share Creation
                </h3>
                <p className="text-[10px] text-textMuted">Spread your neural artwork</p>
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

          {/* Social Buttons Grid */}
          <div className="grid grid-cols-3 gap-2.5 py-4">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/40 bg-surface/60 p-3 text-textPrimary hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all group active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(37,211,102,0.2)]">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.82 14.15c-.24.67-1.39 1.28-1.92 1.36-.51.08-1.16.12-3.38-.8-2.83-1.18-4.66-4.04-4.8-4.23-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.26.54-.33.72-.33.19 0 .38.01.54.02.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.33.02.52-.09.19-.15.3-.29.47-.15.17-.31.37-.44.5-.15.15-.31.31-.13.62.18.31.78 1.29 1.68 2.09 1.15 1.03 2.12 1.35 2.43 1.5.31.15.49.13.67-.08.19-.21.79-.92 1-1.24.21-.31.42-.26.7-.16.29.11 1.81.85 2.12 1 .31.16.52.24.6.37.07.13.07.76-.17 1.43z"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold">WhatsApp</span>
            </button>

            {/* Instagram */}
            <button
              type="button"
              onClick={handleInstagram}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/40 bg-surface/60 p-3 text-textPrimary hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-400 transition-all group active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(225,48,108,0.3)]">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold">Instagram</span>
            </button>

            {/* X / Twitter */}
            <button
              type="button"
              onClick={handleTwitter}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/40 bg-surface/60 p-3 text-textPrimary hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-400 transition-all group active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold">X (Twitter)</span>
            </button>
          </div>

          {/* Direct Link Input */}
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-surface/40 p-1.5 pl-3">
            <input
              type="text"
              readOnly
              value={fullImageUrl}
              className="flex-1 bg-transparent text-xs text-textMuted focus:outline-none truncate select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "bg-primary text-background hover:bg-primaryHover"
              }`}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          {/* More sharing options (native) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/30 bg-surface/30 py-2 text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-surface transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              More Device Options...
            </button>
          )}

          {/* Feedback Toast */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 left-4 right-4 rounded-xl bg-emerald-500 px-3 py-2 text-center text-xs font-bold text-white shadow-xl"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
