import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Media } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ImageView() {
  const { token, mediaId } = useParams<{ token: string; mediaId: string }>();
  const [media, setMedia] = useState<Media | null>(null);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/gallery/${token}/media`).then(({ data }) => {
      setAllMedia(data.media);
      const found = data.media.find((m: Media) => m.id === mediaId);
      setMedia(found || null);
    }).finally(() => setLoading(false));
  }, [token, mediaId]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!media) return <div className="text-center py-20 text-muted">Image not found</div>;

  const currentIndex = allMedia.findIndex((m) => m.id === mediaId);

  function goTo(idx: number) {
    if (idx >= 0 && idx < allMedia.length) {
      navigate(`/gallery/${token}/${allMedia[idx].id}`);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <button onClick={() => navigate(`/gallery/${token}`)} className="text-sm text-gray-300 hover:text-white">
          Back to Gallery
        </button>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {allMedia.length}</span>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        {currentIndex > 0 && (
          <button onClick={() => goTo(currentIndex - 1)} className="absolute left-4 text-white/70 hover:text-white">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <img src={media.compressed_url || ''} alt={media.filename} className="max-h-[85vh] max-w-[90vw] object-contain" />
        {currentIndex < allMedia.length - 1 && (
          <button onClick={() => goTo(currentIndex + 1)} className="absolute right-4 text-white/70 hover:text-white">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
