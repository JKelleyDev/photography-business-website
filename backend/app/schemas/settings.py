from typing import Any
from pydantic import BaseModel


class UpdateSettingRequest(BaseModel):
    value: Any


class SettingResponse(BaseModel):
    key: str
    value: Any
