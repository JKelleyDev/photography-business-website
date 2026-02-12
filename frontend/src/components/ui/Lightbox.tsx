import { useEffect, useCallback } from 'react';

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

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
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
          onClick={onClose}
          className="text-white/70 hover:text-white p-2"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous */}
      {currentIndex > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
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
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
