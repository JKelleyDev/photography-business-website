export function newPricingPackage(
  name: string,
  description: string,
  priceCents: number,
  priceDisplay: string,
  features: string[] = [],
  isCustom = false,
  sortOrder = 0,
) {
  const now = new Date();
  return {
    name,
    description,
    price_cents: priceCents,
    price_display: priceDisplay,
    features,
    is_custom: isCustom,
    sort_order: sortOrder,
    is_visible: true,
    created_at: now,
    updated_at: now,
  };
}
