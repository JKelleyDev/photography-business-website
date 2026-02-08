from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class CreateReviewRequest(BaseModel):
    author_name: str
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    body: str
    project_id: str | None = None


class UpdateReviewRequest(BaseModel):
    is_approved: bool | None = None
    body: str | None = None


class ReviewResponse(BaseModel):
    id: str
    author_name: str
    rating: int
    body: str
    is_approved: bool
    created_at: datetime
