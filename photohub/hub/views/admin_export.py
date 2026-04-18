"""
Admin Export / Import — /api/admin/export and /api/admin/import

Export: writes _meta.yml + _exif.yml per photo into DUMP_ROOT.
        Optionally copies the raw .jpg file alongside.
Import: scans DUMP_ROOT for raw .jpg and .mp4 files, ingests each one:
        - reads _meta.yml if present (tags, favorite, rating, description, owner, published)
        - if photo already exists (same filename): updates metadata only
        - if new: creates the photo record and re-extracts EXIF from the raw file
        - regenerates samples according to GENERATE_SAMPLES_ON_UPLOAD setting

Access: admin only (is_staff).
"""
import os
import shutil
import threading
import yaml
from datetime import datetime, timezone
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import File
from django.views.decorators.http import require_http_methods
from ..utils import admin_required, json_decode, Response, getRawPath, get_setting, generate_photo_samples, get_exif
from ..errors import ErrorRequest
from ..logger import LOG
from .. import models

EXPORT_STATUS_FILE = "export_status.yml"
IMPORT_STATUS_FILE = "import_status.yml"


def _export_status_path():
    return os.path.join(settings.DUMP_ROOT, EXPORT_STATUS_FILE)


def _import_status_path():
    return os.path.join(settings.DUMP_ROOT, IMPORT_STATUS_FILE)


def _write_status(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


@admin_required
@require_http_methods(["GET"])
def export_status(request):
    path = _export_status_path()
    if not os.path.exists(path):
        return Response(200, data={"status": "none"})
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return Response(200, data=data)


@admin_required
@require_http_methods(["GET"])
def import_status(request):
    path = _import_status_path()
    if not os.path.exists(path):
        return Response(200, data={"status": "none"})
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return Response(200, data=data)


@admin_required
@require_http_methods(["POST"])
def export_dump(request):
    """Export all photos to DUMP_ROOT. Body: { include_raw: bool }"""
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)
    include_raw = bool(body.get("include_raw", False))

    def _run():
        dump_root = settings.DUMP_ROOT
        if os.path.exists(dump_root):
            shutil.rmtree(dump_root)
        os.makedirs(dump_root, exist_ok=True)

        photos = list(models.Photo.objects.all())
        total = len(photos)
        errors = []
        started_at = datetime.now(timezone.utc).isoformat()

        _write_status(_export_status_path(), {
            "status": "pending", "done": 0, "total": total,
            "include_raw": include_raw, "started_at": started_at,
        })

        step = max(1, total // 20)
        for i, photo in enumerate(photos, 1):
            LOG.info("Export %d/%d — %s" % (i, total, photo.filename))
            try:
                _export_photo(photo, dump_root, include_raw)
            except Exception as e:
                LOG.error("Export failed for %s: %s" % (photo.filename, e))
                errors.append("%s: %s" % (photo.filename, str(e)))
            if i % step == 0 or i == total:
                _write_status(_export_status_path(), {
                    "status": "pending", "done": i, "total": total,
                    "include_raw": include_raw, "started_at": started_at,
                })

        _write_status(_export_status_path(), {
            "status": "completed", "done": total, "total": total,
            "errors": errors, "include_raw": include_raw,
            "started_at": started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        LOG.info("Export complete: %d photos, %d errors" % (total, len(errors)))

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return Response(200, data={"message": "Export started in background"})


def _export_photo(photo, dump_root, include_raw):
    # --- _meta.yml ---
    tags = {}
    for t in photo.tags.all():
        group = t.tag_group.name
        tags.setdefault(group, []).append(t.name)

    meta = {
        "filename":         photo.filename,
        "origin_filename":  photo.origin_filename,
        "owner":            photo.owner,
        "published":        photo.published,
        "description":      photo.description,
        "favorite":         photo.favorite,
        "rating":           photo.rating,
        "tags":             tags,
        "type":             photo.type,
        "width":            photo.width,
        "height":           photo.height,
        "duration":         photo.duration,
    }
    meta_path = os.path.join(dump_root, "%s_meta.yml" % photo.filename)
    with open(meta_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(meta, f, allow_unicode=True, sort_keys=False)

    # --- _exif.yml ---
    exif_data = {e.name: e.value for e in models.Exif.objects.filter(photo=photo)}
    if exif_data:
        exif_path = os.path.join(dump_root, "%s_exif.yml" % photo.filename)
        with open(exif_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(exif_data, f, allow_unicode=True, sort_keys=False)

    # --- raw file(s) (optional) ---
    if include_raw:
        raw_storage_path = getRawPath(photo.filename)
        if default_storage.exists(raw_storage_path):
            dest = os.path.join(dump_root, photo.filename)
            with default_storage.open(raw_storage_path, "rb") as src:
                with open(dest, "wb") as dst:
                    shutil.copyfileobj(src, dst)
        # For videos, also export the poster JPG so samples can regenerate on import
        if photo.type == 'video':
            poster_filename = photo.filename.rsplit('.', 1)[0] + '.jpg'
            poster_storage_path = getRawPath(poster_filename)
            if default_storage.exists(poster_storage_path):
                dest = os.path.join(dump_root, poster_filename)
                with default_storage.open(poster_storage_path, "rb") as src:
                    with open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst)


@admin_required
@require_http_methods(["POST"])
def import_dump(request):
    """Import photos from DUMP_ROOT. Runs in background, progress via import_status.yml."""
    dump_root = settings.DUMP_ROOT
    if not os.path.exists(dump_root):
        return ErrorRequest(details="DUMP_ROOT does not exist: %s" % dump_root)

    all_files = os.listdir(dump_root)
    media_files = [f for f in all_files
                   if (f.endswith(".jpg") or f.endswith(".mp4"))
                   and not f.endswith("_meta.yml") and not f.endswith("_exif.yml")]
    # Exclude poster JPGs that are video companions (same stem as an .mp4)
    mp4_stems = {f[:-4] for f in media_files if f.endswith(".mp4")}
    media_files = [f for f in media_files if not (f.endswith(".jpg") and f[:-4] in mp4_stems)]

    if not media_files:
        return Response(200, data={"message": "No media files found in %s" % dump_root})

    def _run():
        total = len(media_files)
        imported, updated, errors = 0, 0, []
        started_at = datetime.now(timezone.utc).isoformat()
        step = max(1, total // 20)

        _write_status(_import_status_path(), {
            "status": "pending", "done": 0, "total": total,
            "imported": 0, "updated": 0, "started_at": started_at,
        })

        for i, filename in enumerate(media_files, 1):
            raw_path = os.path.join(dump_root, filename)
            meta_path = os.path.join(dump_root, "%s_meta.yml" % filename)
            meta = {}
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = yaml.safe_load(f) or {}
            try:
                existing = models.Photo.objects.filter(filename=filename).first()
                if existing:
                    _update_photo_meta(existing, meta)
                    updated += 1
                    LOG.info("Import updated %d/%d: %s" % (i, total, filename))
                else:
                    _create_photo_from_dump(filename, raw_path, meta)
                    imported += 1
                    LOG.info("Import created %d/%d: %s" % (i, total, filename))
            except Exception as e:
                LOG.error("Import failed for %s: %s" % (filename, e))
                errors.append("%s: %s" % (filename, str(e)))

            if i % step == 0 or i == total:
                _write_status(_import_status_path(), {
                    "status": "pending", "done": i, "total": total,
                    "imported": imported, "updated": updated, "started_at": started_at,
                })

        _write_status(_import_status_path(), {
            "status": "completed", "done": total, "total": total,
            "imported": imported, "updated": updated, "errors": errors,
            "started_at": started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        LOG.info("Import complete: %d created, %d updated, %d errors" % (imported, updated, len(errors)))

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return Response(200, data={"message": "Import started in background"})


def _update_photo_meta(photo, meta):
    """Update metadata on an existing photo from a meta dict."""
    if "origin_filename" in meta:
        photo.origin_filename = meta["origin_filename"]
    if "description" in meta:
        photo.description = meta["description"]
    if "favorite" in meta:
        photo.favorite = bool(meta["favorite"])
    if "rating" in meta:
        photo.rating = int(meta["rating"])
    photo.save()

    if "tags" in meta:
        _apply_tags(photo, meta["tags"])


def _create_photo_from_dump(filename, raw_path, meta):
    """Create a new Photo from a raw file + optional meta dict."""
    owner = meta.get("owner", "import")
    description = meta.get("description", "")
    favorite = bool(meta.get("favorite", False))
    rating = int(meta.get("rating", 0))
    published = bool(meta.get("published", False))

    is_video = filename.endswith(".mp4")
    media_type = meta.get("type", "video" if is_video else "photo")

    # Copy raw file into storage
    storage_path = getRawPath(filename)
    if not default_storage.exists(storage_path):
        with open(raw_path, "rb") as f:
            default_storage.save(storage_path, File(f, name=filename))

    # For videos, also restore the poster JPG if present in dump
    if is_video:
        poster_filename = filename.rsplit('.', 1)[0] + '.jpg'
        poster_dump_path = os.path.join(os.path.dirname(raw_path), poster_filename)
        if os.path.exists(poster_dump_path):
            poster_storage_path = getRawPath(poster_filename)
            if not default_storage.exists(poster_storage_path):
                with open(poster_dump_path, "rb") as f:
                    default_storage.save(poster_storage_path, File(f, name=poster_filename))

    # Extract dimensions — from meta if available, else EXIF for photos
    width  = int(meta.get("width") or 0)
    height = int(meta.get("height") or 0)
    exifs  = {}
    if not is_video:
        with default_storage.open(storage_path, "rb") as f:
            exifs = get_exif(f)
        if not width:  width  = int(exifs.get("Width", 0))
        if not height: height = int(exifs.get("Height", 0))

    photo = models.Photo(
        filename=filename,
        owner=owner,
        description=description,
        favorite=favorite,
        rating=rating,
        published=published,
        type=media_type,
        transcode_status='done' if not is_video else 'pending',
        duration=meta.get("duration"),
        origin_filename=meta.get("origin_filename") or filename,
        width=width,
        height=height,
    )
    photo.save()

    # Save EXIF records (photos only)
    for name, value in exifs.items():
        if name not in ("Width", "Height"):
            models.Exif.objects.update_or_create(photo=photo, name=name, defaults={"value": str(value)})

    if "tags" in meta:
        _apply_tags(photo, meta["tags"])

    # Generate samples for photos; videos will be handled by the worker
    if not is_video and get_setting("GENERATE_SAMPLES_ON_UPLOAD"):
        generate_photo_samples(filename)
    elif is_video and os.path.exists(os.path.join(os.path.dirname(raw_path), filename.rsplit('.', 1)[0] + '.jpg')):
        # Poster available — generate samples immediately, mark done
        generate_photo_samples(filename)
        photo.transcode_status = 'done'
        photo.save(update_fields=['transcode_status'])


def _apply_tags(photo, tags_dict):
    """Replace photo tags from a { groupName: [tagName, ...] } dict."""
    photo.tags.clear()
    for group_name, tag_names in tags_dict.items():
        group, _ = models.TagGroup.objects.get_or_create(name=group_name)
        for tag_name in tag_names:
            tag, _ = models.Tag.objects.get_or_create(name=tag_name, tag_group=group)
            photo.tags.add(tag)
