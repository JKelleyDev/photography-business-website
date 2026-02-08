from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.settings import UpdateSettingRequest, SettingResponse

router = APIRouter()


@router.get("")
async def list_settings(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.site_settings.find()
    items = []
    async for s in cursor:
        items.append(SettingResponse(key=s["key"], value=s["value"]))
    return {"settings": items}


@router.put("/{key}")
async def update_setting(key: str, body: UpdateSettingRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    await db.site_settings.update_one(
        {"key": key},
        {"$set": {"key": key, "value": body.value}},
        upsert=True,
    )
    return {"message": "Setting updated"}
