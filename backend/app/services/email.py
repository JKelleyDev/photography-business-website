from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import get_settings


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    settings = get_settings()
    if not settings.SENDGRID_API_KEY:
        print(f"[EMAIL STUB] To: {to_email}, Subject: {subject}")
        return True
    message = Mail(
        from_email=settings.FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_invite_email(to_email: str, name: str, invite_token: str) -> bool:
    settings = get_settings()
    set_password_url = f"{settings.FRONTEND_URL}/set-password/{invite_token}"
    html = f"""
    <h2>Welcome to MAD Photography, {name}!</h2>
    <p>Your account has been created. Click the link below to set your password:</p>
    <p><a href="{set_password_url}">Set Your Password</a></p>
    <p>If you did not expect this email, you can safely ignore it.</p>
    """
    return send_email(to_email, "Welcome to MAD Photography - Set Your Password", html)


def send_gallery_link_email(to_email: str, name: str, gallery_token: str, project_title: str) -> bool:
    settings = get_settings()
    gallery_url = f"{settings.FRONTEND_URL}/gallery/{gallery_token}"
    html = f"""
    <h2>Your photos are ready, {name}!</h2>
    <p>Your <strong>{project_title}</strong> gallery is now available for viewing:</p>
    <p><a href="{gallery_url}">View Your Gallery</a></p>
    <p>From the gallery you can view, select, and download your photos.</p>
    """
    return send_email(to_email, f"Your {project_title} Gallery is Ready!", html)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    settings = get_settings()
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
    html = f"""
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{reset_url}">Reset Password</a></p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    """
    return send_email(to_email, "MAD Photography - Password Reset", html)
