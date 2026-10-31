import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import Lightbox from '../../components/ui/Lightbox';
import FadeImage from '../../components/ui/FadeImage';

export default function Portfolio() {
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    api.get('/portfolio', { params: { limit: '200' } })
      .then(({ data }) => setAllItems(data.items))
      .catch((err) => console.error('Failed to load portfolio', err))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...new Set(allItems.map((i) => i.category))].filter(Boolean);
  const items = activeCategory === 'All' ? allItems : allItems.filter((i) => i.category === activeCategory);
  const lightboxImages = items.map((i) => ({ url: i.image_url || '', alt: i.title }));

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl font-light tracking-[-0.02em] md:text-7xl">Portfolio</h1>
          {!loading && <p className="mt-2 text-fixer">{items.length} frames</p>}
        </div>

        {categories.length > 1 && (
          <div role="tablist" aria-label="Filter by category"
            className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-tray px-4 sm:mx-0 sm:px-0">
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <button key={category} role="tab" aria-selected={active}
                  onClick={() => setActiveCategory(category)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 text-[15px] transition-colors ${
                    active ? 'border-safelight text-ink' : 'border-transparent text-fixer hover:text-ink'
                  }`}>
                  {category}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!loading && items.length === 0 ? (
        <p className="py-20 text-fixer">Nothing in this category yet.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3" aria-busy={loading}>
          {(loading ? Array.from({ length: 9 }, () => null) : items).map((item, index) => (
            <li key={item?.id ?? index}>
              {item ? (
                <button onClick={() => setLightboxIndex(index)} className="group block w-full"
                  aria-label={`Open frame ${index + 1}`}>
                  <div className="skeleton aspect-[4/5] overflow-hidden">
                    <FadeImage src={item.thumbnail_url || ''} alt={`${item.category} photo, frame ${index + 1}`}
                      className="h-full w-full object-cover group-hover:opacity-90" />
                  </div>
                </button>
              ) : (
                <div className="skeleton aspect-[4/5]" />
              )}
              <span className="mt-1 block font-mono text-xs tabular-nums text-fixer">
                {String(index + 1).padStart(2, '0')}
              </span>
            </li>
          ))}
        </ol>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex(Math.min(lightboxIndex + 1, lightboxImages.length - 1))}
          onPrev={() => setLightboxIndex(Math.max(lightboxIndex - 1, 0))}
        />
      )}
    </section>
  );
}
