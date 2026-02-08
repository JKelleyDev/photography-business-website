from pydantic import BaseModel


class CreatePortfolioItemRequest(BaseModel):
    title: str
    description: str | None = None
    category: str = "general"


class UpdatePortfolioItemRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    is_visible: bool | None = None


class ReorderPortfolioRequest(BaseModel):
    item_ids: list[str]


class PortfolioItemResponse(BaseModel):
    id: str
    title: str
    description: str | None
    category: str
    image_url: str | None = None
    thumbnail_url: str | None = None
    sort_order: int
    is_visible: bool
