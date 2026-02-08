from datetime import datetime


def new_review(
    author_name: str,
    email: str,
    rating: int,
    body: str,
    project_id: str | None = None,
) -> dict:
    return {
        "author_name": author_name,
        "email": email,
        "rating": rating,
        "body": body,
        "is_approved": False,
        "project_id": project_id,
        "created_at": datetime.utcnow(),
    }
