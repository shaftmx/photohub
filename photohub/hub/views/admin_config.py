"""
Admin Config view — GET/POST /api/admin/config

GET  — returns current effective values (DB override or settings.py default)
POST — saves values to AppConfig DB table (overrides settings.py at runtime)

Access: admin only (is_staff).
"""
import json
import yaml
import shutil
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from ..utils import admin_required, json_decode, Response, get_setting, getSamplePath
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
def flush_samples(request):
    """Delete all sample files. They will be regenerated lazily on next access."""
    from ..logger import LOG
    sample_settings = get_setting('SAMPLE_PHOTOS_SETTINGS')
    photos = models.Photo.objects.all()
    deleted = 0
    for photo in photos:
        for sample in sample_settings:
            path = getSamplePath(photo.filename, sample["name"])
            if default_storage.exists(path):
                default_storage.delete(path)
                deleted += 1
    LOG.info("Flush samples: deleted %d files" % deleted)
    return Response(200, data={"deleted": deleted})
