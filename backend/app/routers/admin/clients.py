from fastapi import APIRouter, Depends, HTTPException
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.user import CreateClientRequest, UserResponse
from app.models.user import new_user
from app.services.auth import hash_password, create_invite_token
from app.services.email import send_invite_email

router = APIRouter()


@router.get("")
async def list_clients(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.users.find({"role": "client"}).sort("created_at", -1)
    items = []
    async for user in cursor:
        items.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            role=user["role"],
            name=user.get("name", ""),
            phone=user.get("phone"),
            is_active=user["is_active"],
        ))
    return {"clients": items}


@router.post("", status_code=201)
async def create_client(body: CreateClientRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    invite_token = create_invite_token()
    user = new_user(
        email=body.email,
        password_hash=hash_password(invite_token),
        role="client",
        name=body.name,
    )
    user["phone"] = body.phone
    user["invite_token"] = invite_token
    result = await db.users.insert_one(user)
    send_invite_email(body.email, body.name, invite_token)
    return {"id": str(result.inserted_id), "message": "Client created and invite sent"}
