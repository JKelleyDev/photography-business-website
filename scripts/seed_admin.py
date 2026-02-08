#!/usr/bin/env python3
"""Seed an admin user into the database."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import connect_db, get_database
from app.models.user import new_user
from app.services.auth import hash_password


async def seed_admin(email: str, password: str, name: str = "Admin"):
    await connect_db()
    db = get_database()
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"User {email} already exists.")
        return
    user = new_user(email=email, password_hash=hash_password(password), role="admin", name=name)
    await db.users.insert_one(user)
    print(f"Admin user {email} created successfully.")


if __name__ == "__main__":
    email = os.getenv("ADMIN_SEED_EMAIL", "admin@madphotography.com")
    password = os.getenv("ADMIN_SEED_PASSWORD", "changeme123")
    name = os.getenv("ADMIN_SEED_NAME", "MAD Admin")
    asyncio.run(seed_admin(email, password, name))
