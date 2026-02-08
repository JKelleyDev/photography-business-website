from datetime import datetime


def new_pricing_package(
    name: str,
    description: str,
    price_cents: int,
    price_display: str,
    features: list[str] | None = None,
    is_custom: bool = False,
    sort_order: int = 0,
) -> dict:
    return {
        "name": name,
        "description": description,
        "price_cents": price_cents,
        "price_display": price_display,
        "features": features or [],
        "is_custom": is_custom,
        "sort_order": sort_order,
        "is_visible": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
