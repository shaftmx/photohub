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

@login_required
@require_http_methods(["GET"])
def get_unpublished(request):
    photos = models.Photo.objects.filter(published=False).order_by("-date").all()
    
    # excludes = ["id", "description", "published"]
    # data = [ model_to_dict(i, exclude=excludes) for i in photos ]
    fields = ["filename", "date", "owner", "height", "width", "tags"]
    
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

        data_photos.append(_p)
    data = { "photos": data_photos,
             "paths": get_photo_root_paths() }
    return Response(200, data=data)
# for e in Entry.objects.all():
#     print(e.headline)


@login_required
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


