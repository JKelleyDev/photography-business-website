from datetime import datetime


def new_inquiry(
    name: str,
    email: str,
    message: str,
    phone: str | None = None,
    package_id: str | None = None,
    event_date: datetime | None = None,
    event_time: str | None = None,
    event_duration: str | None = None,
) -> dict:
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "package_id": package_id,
        "message": message,
        "event_date": event_date,
        "event_time": event_time,
        "event_duration": event_duration,
        "status": "new",
        "created_at": datetime.utcnow(),
    }
