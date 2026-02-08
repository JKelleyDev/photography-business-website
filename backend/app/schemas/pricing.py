from pydantic import BaseModel


class CreatePricingRequest(BaseModel):
    name: str
    description: str
    price_cents: int = 0
    price_display: str = ""
    features: list[str] = []
    is_custom: bool = False


class UpdatePricingRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    price_cents: int | None = None
    price_display: str | None = None
    features: list[str] | None = None
    is_custom: bool | None = None
    is_visible: bool | None = None


class PricingResponse(BaseModel):
    id: str
    name: str
    description: str
    price_cents: int
    price_display: str
    features: list[str]
    is_custom: bool
    sort_order: int
    is_visible: bool
