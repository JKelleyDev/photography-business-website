import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import Lightbox from '../../components/ui/Lightbox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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

  const lightboxImages = items.map((i) => ({
    url: i.image_url || '',
    alt: i.title,
  }));

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
              Selected Work
            </p>
            <h1 className="text-3xl md:text-4xl font-serif font-light">Portfolio</h1>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    activeCategory === category
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-secondary-foreground hover:bg-border'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            No portfolio items yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary text-left"
              >
                <img
                  src={item.thumbnail_url || ''}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-sm text-background/80">{item.category}</p>
                  <h3 className="text-lg font-medium text-background">{item.title}</h3>
                </div>
              </button>
            ))}
          </div>
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
      </div>
    </section>
  );
}
