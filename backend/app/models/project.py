from datetime import datetime


def new_project(
    title: str,
    client_id: str,
    description: str = "",
    categories: list[str] | None = None,
) -> dict:
    return {
        "title": title,
        "description": description,
        "client_id": client_id,
        "status": "active",
        "cover_image_key": None,
        "categories": categories or [],
        "share_link_token": None,
        "share_link_expires_at": None,
        "project_expires_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
