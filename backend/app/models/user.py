from datetime import datetime


def new_user(email: str, password_hash: str, role: str = "client", name: str = "") -> dict:
    return {
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "name": name,
        "phone": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
    }
