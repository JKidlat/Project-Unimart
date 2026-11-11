"""
Persistent image upload, validation, and delivery utilities for Unimart.

Images are validated by magic bytes and byte size limit (5 MB max), rejecting
HTML/SVG scripts or non-image binaries. When `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are configured, files upload to Supabase Storage;
otherwise images persist inside PostgreSQL (`MediaAsset`) and are served cleanly
via `/api/media/<uuid>/` so uploads never disappear across container redeploys.
"""

import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MediaAsset

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def detect_image_content_type(raw_bytes: bytes) -> str | None:
    """Validate actual image file signature (magic bytes) to prevent spoofed uploads."""
    if not raw_bytes or len(raw_bytes) < 12:
        return None
    if raw_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if raw_bytes[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if raw_bytes[:4] == b"RIFF" and raw_bytes[8:12] == b"WEBP":
        return "image/webp"
    return None


def _upload_to_supabase_storage(raw_bytes: bytes, content_type: str, kind: str) -> str | None:
    """Optionally store validated image bytes into a public Supabase Storage bucket."""
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "unimart-media").strip() or "unimart-media"
    if not supabase_url or not service_key:
        return None

    ext = EXT_BY_MIME.get(content_type, ".jpg")
    object_path = f"{kind}/{uuid.uuid4()}{ext}"
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"

    req = urllib.request.Request(
        upload_url,
        data=raw_bytes,
        method="POST",
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if 200 <= resp.status < 300:
                return f"{supabase_url}/storage/v1/object/public/{bucket}/{object_path}"
    except Exception:
        # Fall back cleanly to PostgreSQL MediaAsset if Supabase bucket isn't ready
        return None
    return None


def store_uploaded_image(uploaded_file, request, user=None, kind="general"):
    """Validate and persistently store a single Django UploadedFile image."""
    if uploaded_file is None:
        raise ValidationError({"file": "No image file was provided."})

    if getattr(uploaded_file, "size", 0) > MAX_IMAGE_BYTES:
        raise ValidationError(
            {"file": f'"{uploaded_file.name}" exceeds the maximum 5 MB image size limit.'}
        )

    raw_bytes = uploaded_file.read()
    if not raw_bytes:
        raise ValidationError({"file": "Uploaded image file is empty."})
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise ValidationError({"file": "Image exceeds the maximum 5 MB upload size limit."})

    content_type = detect_image_content_type(raw_bytes)
    if not content_type:
        raise ValidationError(
            {"file": "Unsupported image format. Please upload a valid JPG, PNG, WebP, or GIF image."}
        )

    supabase_public_url = _upload_to_supabase_storage(raw_bytes, content_type, kind)
    if supabase_public_url:
        return {
            "id": None,
            "url": supabase_public_url,
            "content_type": content_type,
            "size": len(raw_bytes),
        }

    asset = MediaAsset.objects.create(
        uploaded_by=user if (user and user.is_authenticated) else None,
        kind=kind if kind in dict(MediaAsset.KIND_CHOICES) else "general",
        original_name=Path(getattr(uploaded_file, "name", "image")).name[:255],
        content_type=content_type,
        size_bytes=len(raw_bytes),
        data=raw_bytes,
    )
    relative_path = f"/api/media/{asset.id}/"
    absolute_url = request.build_absolute_uri(relative_path) if request else relative_path
    return {
        "id": str(asset.id),
        "url": absolute_url,
        "content_type": content_type,
        "size": asset.size_bytes,
    }


def normalize_public_image_url(value: str | None, request=None) -> str | None:
    """Resolve stored relative media paths into full request-accessible URLs cleanly."""
    if not value or not isinstance(value, str):
        return value
    cleaned = value.strip()
    if not cleaned:
        return cleaned
    if cleaned.startswith("/api/media/") and request is not None:
        return request.build_absolute_uri(cleaned)
    return cleaned


class MediaUploadView(APIView):
    """Upload one or more validated images via multipart FormData."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        kind = (request.data.get("kind") or request.query_params.get("kind") or "general").strip().lower()
        files = request.FILES.getlist("files") or request.FILES.getlist("file") or request.FILES.getlist("image")
        if not files:
            return Response(
                {"error": "Please select at least one valid image file to upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(files) > 5:
            return Response(
                {"error": "You can upload a maximum of 5 images at once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []
        for f in files:
            results.append(store_uploaded_image(f, request, user=request.user, kind=kind))

        return Response(
            {
                "url": results[0]["url"],
                "urls": [r["url"] for r in results],
                "results": results,
            },
            status=status.HTTP_201_CREATED,
        )


class MediaServeView(APIView):
    """Serve stored MediaAsset bytes with caching and strict content-type headers."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        asset = MediaAsset.objects.filter(id=pk).only("content_type", "data", "id").first()
        if not asset:
            return Response({"error": "Image not found."}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(bytes(asset.data), content_type=asset.content_type)
        response["Cache-Control"] = "public, max-age=31536000, immutable"
        response["X-Content-Type-Options"] = "nosniff"
        return response
