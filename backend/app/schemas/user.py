from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SetPasswordRequest(BaseModel):
    token: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class CreateClientRequest(BaseModel):
    email: EmailStr
    name: str
    phone: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    name: str
    phone: str | None = None
    is_active: bool
