interface ImageGridProps {
  images: { id: string; thumbnailUrl: string; alt?: string }[];
  onImageClick?: (index: number) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function ImageGrid({ images, onImageClick, selectable, selectedIds, onToggleSelect }: ImageGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-3">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative group aspect-square bg-tray overflow-hidden cursor-pointer"
          onClick={() => onImageClick?.(index)}
        >
          <img
            src={image.thumbnailUrl}
            alt={image.alt || ''}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
          />
          {selectable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(image.id);
              }}
              className={`absolute top-1 right-1 w-11 h-11 p-2 bg-clip-content rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedIds?.has(image.id)
                  ? 'bg-accent border-accent text-white'
                  : 'bg-white/80 border-white/80 text-transparent hover:border-accent'
              }`}
              aria-label={selectedIds?.has(image.id) ? 'Deselect photo' : 'Select photo'}
              aria-pressed={selectedIds?.has(image.id)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
