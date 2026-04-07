from django.db import IntegrityError
from ..logger import LOG
from ..utils import *
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.files.storage import default_storage
from .. import models
from django.forms.models import model_to_dict


#
# Get single photo detail (metadata + exif + tags)
#
@login_required
@require_http_methods(["GET"])
def get_photo(request, filename):
    try:
        p = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")

    fields = ["filename", "date", "owner", "height", "width", "description", "published", "origin_filename"]
    _p = model_to_dict(p, fields=fields)
    _p["upload_date"] = p.upload_date.isoformat() if p.upload_date else ""
    _p["date"] = p.date.isoformat() if p.date else ""
    _p["hash_path"] = genHasingPath(_p["filename"])

    # Tags
    _p["tags"] = {}
    for t in p.tags.all():
        _group = t.tag_group.name
        if _group not in _p["tags"]:
            _p["tags"][_group] = {"color": t.tag_group.color, "tags": []}
        _p["tags"][_group]["tags"].append({"name": t.name, "color": t.color})

    # Exif
    _p["exif"] = {}
    for e in models.Exif.objects.filter(photo=p):
        _p["exif"][e.name] = e.value

    data = {"photo": _p, "paths": get_photo_root_paths()}
    return Response(200, data=data)


#
# Unpublish a photo (published=False)
#
@login_required
@require_http_methods(["POST"])
def unpublish_photo(request, filename):
    try:
        photo = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")

    photo.published = False
    photo.save()
    LOG.info("Unpublished photo %s" % filename)
    return Response(200, "success")


#
# Delete a photo (DB + files on disk)
#
@login_required
@require_http_methods(["POST"])
def delete_photo(request, filename):
    try:
        photo = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")

    # Delete raw file
    raw_path = getRawPath(filename)
    if default_storage.exists(raw_path):
        default_storage.delete(raw_path)
        LOG.info("Deleted raw file %s" % raw_path)

    # Delete all sample files
    for sample in settings.SAMPLE_PHOTOS_SETTINGS:
        sample_path = getSamplePath(filename, sample["name"])
        if default_storage.exists(sample_path):
            default_storage.delete(sample_path)
            LOG.info("Deleted sample %s" % sample_path)

    # Delete DB entry (cascade deletes Exif entries)
    photo.delete()
    LOG.info("Deleted photo from DB: %s" % filename)

    return Response(200, "success")


#
# Update photo description/metadata
#
@login_required
@require_http_methods(["POST"])
def update_photo(request, filename):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    try:
        photo = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")

    if "description" in post:
        photo.description = post["description"]

    photo.save()
    return Response(200, "success")
