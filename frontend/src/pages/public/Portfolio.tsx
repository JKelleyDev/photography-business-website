import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import ImageGrid from '../../components/ui/ImageGrid';
import Lightbox from '../../components/ui/Lightbox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, [activeCategory]);

  async function loadPortfolio() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get('/portfolio', { params });
      setItems(data.items);
    } catch (err) {
      console.error('Failed to load portfolio', err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [...new Set(items.map((i) => i.category))];
  const gridImages = items.map((i) => ({
    id: i.id,
    thumbnailUrl: i.thumbnail_url || '',
    alt: i.title,
  }));
  const lightboxImages = items.map((i) => ({
    url: i.image_url || '',
    alt: i.title,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-primary mb-3">Portfolio</h1>
        <p className="text-muted max-w-xl mx-auto">A collection of our favorite work.</p>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <p className="text-center text-muted py-20">No portfolio items yet. Check back soon!</p>
      ) : (
        <ImageGrid images={gridImages} onImageClick={(idx) => setLightboxIndex(idx)} />
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
  );
}
