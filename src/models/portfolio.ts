export function newPortfolioItem(
  title: string,
  imageKey: string,
  thumbnailKey: string,
  category = 'general',
  description: string | null = null,
  sortOrder = 0,
) {
  return {
    title,
    description,
    category,
    image_key: imageKey,
    thumbnail_key: thumbnailKey,
    sort_order: sortOrder,
    is_visible: true,
    created_at: new Date(),
  };
}
