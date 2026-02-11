from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING
from app.config import get_settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGO_URI, maxPoolSize=10)
    db_name = settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "mad_photography"
    _db = _client[db_name]
    await _create_indexes()


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db


async def _create_indexes() -> None:
    db = get_database()
    await db.users.create_index([("email", ASCENDING)], unique=True)
    # Drop old index if it exists, then recreate as a partial index
    # (only indexes documents where share_link_token exists and is not null)
    try:
        await db.projects.drop_index("share_link_token_1")
    except Exception:
        pass
    await db.projects.create_index(
        [("share_link_token", ASCENDING)],
        unique=True,
        partialFilterExpression={"share_link_token": {"$type": "string"}},
    )
    await db.media.create_index([("project_id", ASCENDING)])
    await db.portfolio_items.create_index([("sort_order", ASCENDING)])
    await db.pricing_packages.create_index([("sort_order", ASCENDING)])
    await db.reviews.create_index([("is_approved", ASCENDING)])
    await db.invoices.create_index([("client_id", ASCENDING)])
    await db.invoices.create_index([("token", ASCENDING)], unique=True)
    await db.site_settings.create_index([("key", ASCENDING)], unique=True)
