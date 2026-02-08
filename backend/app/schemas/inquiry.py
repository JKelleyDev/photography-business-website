from datetime import datetime
from pydantic import BaseModel, EmailStr


class CreateInquiryRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    package_id: str | None = None
    message: str
    event_date: datetime | None = None


class UpdateInquiryRequest(BaseModel):
    status: str


class InquiryResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None
    package_id: str | None
    message: str
    event_date: datetime | None
    status: str
    created_at: datetime
