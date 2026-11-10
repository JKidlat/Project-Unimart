"""
Transactional email helpers for Unimart (verification & password reset).

Uses the Resend HTTPS API (Port 443) so email delivery works on Render's
Free tier where outbound SMTP ports (25, 465, 587) are blocked.
"""

import html
import json
import logging
import urllib.error
import urllib.request
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)

EMAIL_VERIFY_SALT = "unimart-email-verify"
RESEND_API_URL = "https://api.resend.com/emails"


def make_email_verification_token(user) -> str:
    """Create a time-limited, email-bound verification token for the user."""
    signer = TimestampSigner(salt=EMAIL_VERIFY_SALT)
    return signer.sign(f"{user.pk}:{user.email.lower()}")


def verify_email_verification_token(token: str):
    """
    Validate an email verification token and return the matching User if valid.
    Returns None if expired, tampered with, or the user's email changed.
    """
    if not token:
        return None
    signer = TimestampSigner(salt=EMAIL_VERIFY_SALT)
    max_age = getattr(settings, "EMAIL_VERIFICATION_MAX_AGE", 60 * 60 * 24 * 3)
    try:
        payload = signer.unsign(token, max_age=max_age)
        user_id_str, token_email = payload.split(":", 1)
        User = get_user_model()
        user = User.objects.filter(pk=int(user_id_str), is_active=True).first()
        if not user or user.email.lower() != token_email.lower():
            return None
        return user
    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return None


def send_transactional_email_detailed(
    to_email: str, subject: str, html_body: str, text_body: str
) -> tuple[bool, str]:
    """
    Send a transactional email via the Resend HTTPS API.
    Returns (True, "") if accepted by Resend, or (False, safe_error_reason) otherwise.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "").strip().strip('"').strip("'")
    from_email = (
        getattr(settings, "DEFAULT_FROM_EMAIL", "Unimart <onboarding@resend.dev>")
        .strip()
        .strip('"')
        .strip("'")
        or "Unimart <onboarding@resend.dev>"
    )

    if not api_key:
        logger.warning(
            "RESEND_API_KEY is not configured. Skipping live email to %s (Subject: %s). Content:\n%s",
            to_email,
            subject,
            text_body,
        )
        return False, "RESEND_API_KEY is not configured on the backend."

    payload = json.dumps({
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }).encode("utf-8")

    request = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Unimart-Backend/1.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return True, ""
            return False, f"Resend returned HTTP {response.status}."
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="ignore")
        logger.error("Resend API error (%s) sending to %s from %s: %s", exc.code, to_email, from_email, err_body)
        safe_msg = f"Email provider error ({exc.code})."
        try:
            parsed = json.loads(err_body)
            if isinstance(parsed, dict) and parsed.get("message"):
                safe_msg = str(parsed["message"])
        except Exception:
            pass
        return False, safe_msg
    except Exception as exc:
        logger.error("Unexpected error sending email to %s: %s", to_email, exc)
        return False, "Unable to contact email delivery provider."


def send_transactional_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Compatibility wrapper returning boolean delivery success."""
    ok, _ = send_transactional_email_detailed(to_email, subject, html_body, text_body)
    return ok


def _get_frontend_base_url() -> str:
    return getattr(settings, "FRONTEND_URL", "https://project-unimart.vercel.app").rstrip("/")


def send_verification_email_detailed(user) -> tuple[bool, str]:
    """Generate a verification link, send it, and return (sent, error_detail)."""
    token = make_email_verification_token(user)
    verify_url = f"{_get_frontend_base_url()}/verify-email?{urlencode({'token': token})}"
    display_name = html.escape(user.full_name or user.email.split("@")[0])

    subject = "Verify your email address — Unimart Ghana"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #a14b58; margin-bottom: 12px;">Welcome to Unimart, {display_name}!</h2>
      <p style="line-height: 1.6;">
        Please confirm your email address to unlock placing orders, listing items, and student seller verification across Ghana's campus marketplace.
      </p>
      <p style="margin: 24px 0;">
        <a href="{verify_url}" style="background-color: #a14b58; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br />
        {html.escape(verify_url)}
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        This link expires in 72 hours. If you did not create a Unimart account, you can safely ignore this message.
      </p>
    </div>
    """
    text_body = (
        f"Welcome to Unimart, {user.full_name or user.email}!\n\n"
        f"Verify your email address using this link (expires in 72 hours):\n{verify_url}\n"
    )
    return send_transactional_email_detailed(user.email, subject, html_body, text_body)


def send_verification_email(user) -> bool:
    """Generate a verification link and send it to the user's email address."""
    ok, _ = send_verification_email_detailed(user)
    return ok


def send_password_reset_email(user) -> bool:
    """Generate a single-use password reset link and email it to the user."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{_get_frontend_base_url()}/reset-password?{urlencode({'uid': uid, 'token': token})}"
    display_name = html.escape(user.full_name or user.email.split("@")[0])

    subject = "Reset your password — Unimart Ghana"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #a14b58; margin-bottom: 12px;">Password Reset Request</h2>
      <p style="line-height: 1.6;">
        Hi {display_name}, we received a request to reset your Unimart account password.
      </p>
      <p style="margin: 24px 0;">
        <a href="{reset_url}" style="background-color: #a14b58; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br />
        {html.escape(reset_url)}
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
    """
    text_body = (
        f"Hi {user.full_name or user.email},\n\n"
        f"Reset your Unimart password using this link (expires in 1 hour):\n{reset_url}\n\n"
        "If you did not request a password reset, please ignore this email.\n"
    )
    return send_transactional_email(user.email, subject, html_body, text_body)

