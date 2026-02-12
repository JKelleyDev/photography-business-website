from fastapi import APIRouter, HTTPException, status, Response, Cookie
from bson import ObjectId
from app.database import get_database
from app.services.auth import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.services.email import send_password_reset_email
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    SetPasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
import secrets
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response):
    db = get_database()
    user = await db.users.find_one({"email": body.email, "is_active": True})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["role"])
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
    )
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, refresh_token: str = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "is_active": True})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["role"])
    new_refresh = create_refresh_token(user_id)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
    )
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.post("/set-password")
async def set_password(body: SetPasswordRequest):
    db = get_database()
    user = await db.users.find_one({"invite_token": body.token, "is_active": True})
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(body.password),
                "updated_at": datetime.utcnow(),
            },
            "$unset": {"invite_token": ""},
        },
    )
    return {"message": "Password set successfully"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    db = get_database()
    user = await db.users.find_one({"email": body.email, "is_active": True})
    if user:
        reset_token = secrets.token_urlsafe(32)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expires": datetime.utcnow() + timedelta(hours=1),
                }
            },
        )
        send_password_reset_email(user["email"], reset_token)
    # Always return success to prevent email enumeration
    return {"message": "If an account exists, a reset email has been sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    db = get_database()
    user = await db.users.find_one({
        "reset_token": body.token,
        "reset_token_expires": {"$gt": datetime.utcnow()},
        "is_active": True,
    })
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(body.password),
                "updated_at": datetime.utcnow(),
            },
            "$unset": {"reset_token": "", "reset_token_expires": ""},
        },
    )
    return {"message": "Password reset successfully"}
