"""
Admin Config view — GET/POST /api/admin/config

GET  — returns current effective values (DB override or settings.py default)
POST — saves values to AppConfig DB table (overrides settings.py at runtime)

Access: admin only (is_staff).
"""
import json
import yaml
import shutil
import threading
from django.conf import settings
from django.views.decorators.http import require_http_methods
from ..utils import admin_required, json_decode, Response, generate_photo_samples, getRawPath
from ..errors import ErrorRequest, ErrorUnexpected
from .. import models


# Keys managed via AppConfig
CONFIG_KEYS = ['RAW_PHOTOS_QUALITY', 'RAW_PHOTOS_MAX_SIZE', 'RAW_PHOTO_OVERRIDE_EXISTS', 'SAMPLE_PHOTOS_SETTINGS']


def _get_config_value(key):
    """Return the effective value for a config key: DB override if set, else settings.py default."""
    try:
        return models.AppConfig.objects.get(key=key).value
    except models.AppConfig.DoesNotExist:
        val = getattr(settings, key, None)
        if val is None:
            return None
        if isinstance(val, (list, dict)):
            return yaml.safe_dump(val, allow_unicode=True, default_flow_style=False)
        return str(val)


def _set_config_value(key, value):
    """Upsert a config value in AppConfig."""
    if value is None or value == '':
        models.AppConfig.objects.filter(key=key).delete()
    else:
        models.AppConfig.objects.update_or_create(key=key, defaults={'value': str(value)})


def _get_effective_sample_settings():
    """Return SAMPLE_PHOTOS_SETTINGS as a list (from DB or settings.py)."""
    try:
        raw = models.AppConfig.objects.get(key='SAMPLE_PHOTOS_SETTINGS').value
        return yaml.safe_load(raw)
    except models.AppConfig.DoesNotExist:
        return settings.SAMPLE_PHOTOS_SETTINGS


@admin_required
@require_http_methods(["GET", "POST"])
def config_view(request):
    if request.method == "GET":
        return _get_config(request)
    return _set_config(request)


def _get_config(request):
    data = {
        "RAW_PHOTOS_QUALITY":       _get_config_value('RAW_PHOTOS_QUALITY'),
        "RAW_PHOTOS_MAX_SIZE":      _get_config_value('RAW_PHOTOS_MAX_SIZE'),
        "RAW_PHOTO_OVERRIDE_EXISTS": _get_config_value('RAW_PHOTO_OVERRIDE_EXISTS'),
        "SAMPLE_PHOTOS_SETTINGS":   _get_config_value('SAMPLE_PHOTOS_SETTINGS'),
        # Read-only info
        "MEDIA_ROOT": settings.MEDIA_ROOT,
        "DUMP_ROOT":  settings.DUMP_ROOT,
        "disk_usage": _disk_usage(settings.MEDIA_ROOT),
    }
    return Response(200, data=data)


def _set_config(request):
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)

    for key in ['RAW_PHOTOS_QUALITY', 'RAW_PHOTOS_MAX_SIZE', 'RAW_PHOTO_OVERRIDE_EXISTS']:
        if key in body:
            _set_config_value(key, body[key])

    if 'SAMPLE_PHOTOS_SETTINGS' in body:
        yaml_str = body['SAMPLE_PHOTOS_SETTINGS']
        try:
            parsed = yaml.safe_load(yaml_str)
            if not isinstance(parsed, list):
                return ErrorRequest(details="SAMPLE_PHOTOS_SETTINGS must be a YAML list")
        except yaml.YAMLError as e:
            return ErrorRequest(details="Invalid YAML: %s" % e)
        _set_config_value('SAMPLE_PHOTOS_SETTINGS', yaml_str)

    return Response(200, data={"ok": True})


def _disk_usage(path):
    try:
        usage = shutil.disk_usage(path)
        return {
            "total": usage.total,
            "used":  usage.used,
            "free":  usage.free,
        }
    except Exception:
        return None


@admin_required
@require_http_methods(["POST"])
def resample_all(request):
    """Regenerate all samples for all published photos using current SAMPLE_PHOTOS_SETTINGS."""
    def _run():
        # Patch settings at runtime with DB override if present
        sample_settings = _get_effective_sample_settings()
        original = settings.SAMPLE_PHOTOS_SETTINGS
        settings.SAMPLE_PHOTOS_SETTINGS = sample_settings
        try:
            photos = models.Photo.objects.filter(published=True)
            for photo in photos:
                try:
                    generate_photo_samples(photo.filename)
                except Exception as e:
                    pass
        finally:
            settings.SAMPLE_PHOTOS_SETTINGS = original

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return Response(200, data={"message": "Resample started in background"})
