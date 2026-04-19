from django.db import IntegrityError
from ..logger import LOG
from ..utils import *
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
import re
from django.http import HttpResponseNotFound, HttpResponse
from django.core.files.storage import default_storage
from os.path import basename
from .. import models
from django.forms.models import model_to_dict


#
# Unpublished
#

@admin_or_contributor_required
@require_http_methods(["GET"])
def get_unpublished(request):
    photos_qs = apply_sort(
        models.Photo.objects.filter(published=False),
        request.GET.get('sort_by', 'date'),
        request.GET.get('sort_dir', 'desc'),
    ).all()
    total = photos_qs.count()

    limit = int(request.GET.get('limit') or get_setting('GALLERY_PAGE_SIZE_DESKTOP'))
    photos = photos_qs[:limit]

    fields = PHOTO_LIST_FIELDS
    data_photos = []
    for p in photos:
        _p = model_to_dict(p, fields=fields)
        _p["tags"] = {}

        # TAGS Generate
        for t in p.tags.all():
            _group = t.tag_group.name
            _tag = t.name
            if _group not in _p["tags"]:
                _p["tags"][_group] = []
            _p["tags"][_group].append(_tag)

        # _p["tags"] = model_to_dict( _p["tags"], fields=["name"])
        _p["hash_path"] = genHasingPath(_p["filename"])
        if p.type != 'video':
            _p.pop('transcode_status', None)
            _p.pop('duration', None)

        data_photos.append(_p)
    data = {"photos": data_photos, "total": total, "paths": get_photo_root_paths()}
    return Response(200, data=data)
# for e in Entry.objects.all():
#     print(e.headline)


@admin_or_contributor_required
@require_http_methods(["POST"])
def publish(request):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    photos = post.get("photos", [])

    for filename in photos:
        LOG.info("Publish photo %s" % filename)
        photo = models.Photo.objects.get(filename=filename)
        try:
            photo.published = True
            photo.save()
        except IntegrityError as e:
            return ErrorUnexpected(details="%s" % e, trace=_err)
            
    return Response(200, "success")


