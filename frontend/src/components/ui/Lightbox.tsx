import { useEffect, useCallback, useRef } from 'react';

interface LightboxProps {
  images: { url: string; alt?: string }[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDownload?: (index: number) => void;
}

export default function Lightbox({ images, currentIndex, onClose, onNext, onPrev, onDownload }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    },
    [onClose, onNext, onPrev]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prev?.focus();
  }, []);

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || 'Image viewer'}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-[develop_250ms_ease-out]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -50) onNext();
        if (dx > 50) onPrev();
        touchX.current = null;
      }}
    >
      {/* Top-right actions */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {onDownload && (
          <button
            onClick={() => onDownload(currentIndex)}
            className="text-white/70 hover:text-white p-2"
            title="Download original"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="text-white/70 hover:text-white p-2"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Counter */}
      <div className="absolute top-5 left-4 font-mono text-xs tabular-nums text-white/60">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous */}
      {currentIndex > 0 && (
        <button
          onClick={onPrev}
          aria-label="Previous"
          className="absolute left-2 md:left-4 hidden sm:block top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={current.url}
        alt={current.alt || ''}
        className="max-h-[90vh] max-w-[90vw] object-contain select-none"
        draggable={false}
      />

      {/* Next */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={onNext}
          aria-label="Next"
          className="absolute right-2 md:right-4 hidden sm:block top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
