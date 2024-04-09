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
# Tags
#
@login_required
@require_http_methods(["POST"])
def apply_tags(request):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    # BATCH photo tags
    # If not empty tag batch of photos
    _current_tagged_photos = post.get("current_tagged_photos", [])
    current_tagged_photos = {x["filename"]: x for x in _current_tagged_photos}
    staging_tagged_photos = post.get("staging_tagged_photos", [])
    if current_tagged_photos != {} and staging_tagged_photos != []:
        for p in staging_tagged_photos:
            filename = p["filename"]
            LOG.info("Tag photo %s" % p["filename"])
            photo = models.Photo.objects.get(filename=filename)
            err_response = batch_apply_tags(current=current_tagged_photos[filename]["tags"], staging=p["tags"], photos=[filename])
            if err_response is not None:
                return err_response

    # COMMON TAGS
    # Common tags 3 args
    common_photos_filename = post.get("common_photos_filename", [])
    current_common_tags = post.get("current_common_tags", {})
    staging_common_tags = post.get("staging_common_tags", {})
    err_response = batch_apply_tags(current=current_common_tags, staging=staging_common_tags, photos=common_photos_filename)
    if err_response is not None:
        return err_response

    return Response(200, "success")


@login_required
@require_http_methods(["GET"])
def get_tags(request):
    tags_groups = models.TagGroup.objects.order_by("name").all()
    
    fields = ["name", "color", "description", "type"]

    data_groups = []
    data_tags = []
    for group in tags_groups:
        _g = model_to_dict(group, fields=fields)
        _g["tags"] = []

        # Get group tags
        tags = models.Tag.objects.filter(tag_group=group).order_by("name").all()
        for tag in tags:
            _t = model_to_dict(tag, fields=fields)
            # By default set the color of the group if not specified
            if _t['color'] is None:  _t['color'] = _g["color"]
            _g["tags"].append(_t)
            # Add group in tag for easy reverse map
            _t["group_name"] = _g["name"]
            data_tags.append(_t)
        data_groups.append(_g)

    # tags: [ { "name": "foo", "description": "", "color": "yellow" },  ...]
    # Groupe: [ 
        # { "name": "pays", "description": "List des pays", "color": "red", "type": "checkbox", 
        #    "tags": [ { "name": "Hawaii", "description": "", "color": "yellow" } ] } ]
    data = { "tag_groups": data_groups, "tags": data_tags }

    return Response(200, data=data)




