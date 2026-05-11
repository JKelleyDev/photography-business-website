export function newPortfolioItem(
  title: string,
  imageKey: string,
  thumbnailKey: string,
  category = 'general',
  description: string | null = null,
  sortOrder = 0,
  mediaId: string | null = null,
) {
  return {
    title,
    description,
    category,
    image_key: imageKey,
    thumbnail_key: thumbnailKey,
    sort_order: sortOrder,
    is_visible: true,
    media_id: mediaId,
    created_at: new Date(),
  };
}
