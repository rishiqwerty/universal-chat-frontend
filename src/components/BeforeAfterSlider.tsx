import { useState, useRef, useCallback, MouseEvent, TouchEvent } from "react";

type BeforeAfterSliderProps = {
  beforeImage: string;
  afterImage: string;
  altTitle?: string;
  className?: string;
  aspectRatio?: string;
  showLabels?: boolean;
};

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  altTitle = "Before and after comparison",
  className = "",
  aspectRatio = "aspect-square",
  showLabels = true,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging || e.buttons === 1) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-md cursor-ew-resize group/slider ${aspectRatio} ${className}`}
    >
      {/* "AFTER" Image (Full background) */}
      <img
        src={afterImage}
        alt={`${altTitle} - After`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      {/* "BEFORE" Image (Clipped on left side) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={`${altTitle} - Before`}
          className="absolute inset-0 h-full w-full object-cover max-w-none"
          style={{ width: containerRef.current?.clientWidth ? `${containerRef.current.clientWidth}px` : "100%" }}
          loading="lazy"
        />
      </div>

      {/* Labels */}
      {showLabels && (
        <>
          <span className="absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md border border-white/10 shadow-md">
            BEFORE
          </span>
          <span className="absolute right-2 top-2 z-10 rounded bg-primary/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background backdrop-blur-md shadow-md">
            AFTER
          </span>
        </>
      )}

      {/* Splitter Line & Handle */}
      <div
        className="absolute top-0 bottom-0 z-20 w-0.5 bg-primary shadow-[0_0_10px_rgba(217,255,0,0.8)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-background shadow-[0_0_14px_rgba(217,255,0,0.6)] ring-2 ring-background transition-transform group-hover/slider:scale-110">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
