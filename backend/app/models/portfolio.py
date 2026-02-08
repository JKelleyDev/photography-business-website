from datetime import datetime


def new_portfolio_item(
    title: str,
    image_key: str,
    thumbnail_key: str,
    category: str = "general",
    description: str | None = None,
    sort_order: int = 0,
) -> dict:
    return {
        "title": title,
        "description": description,
        "category": category,
        "image_key": image_key,
        "thumbnail_key": thumbnail_key,
        "sort_order": sort_order,
        "is_visible": True,
        "created_at": datetime.utcnow(),
    }
