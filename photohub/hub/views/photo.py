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
# from django.db.models import Q

#
# Photo
#
@login_required
@require_http_methods(["GET"])
def get_photos(request):

    # Filter tags
    filter_mode = request.GET.get('filter_mode', 'basic')

    filter_tags_query = request.GET.get('tags')
    filter_tag_names = []
    if filter_tags_query is not None:
        filter_tag_names = filter_tags_query.split(',')

    photos_query = models.Photo.objects.filter(published=True)

    # Get all tags entities
    filter_tags = {}
    for tag_name in filter_tag_names:
        _tag = models.Tag.objects.get(name=tag_name)

        if _tag is None: continue

        if _tag.tag_group.name not in filter_tags:
            filter_tags[_tag.tag_group.name] = []
        filter_tags[_tag.tag_group.name].append(_tag)

    # Generate filters
    # Smart: (OR on same groups, AND on other groups) Create a filter per group map
    if filter_tags != {} and filter_mode != "basic":
        for group, tags in filter_tags.items():
            # __in is an embeded django feature to provide several many to many fields
            photos_query = photos_query.filter(tags__in=tags)
    # Basic: AND on each tags
    elif filter_tags != {} and filter_mode == "basic":
        for group, tags in filter_tags.items():
            for tag in tags:
                photos_query = photos_query.filter(tags=tag)

    # disctinct: remove duplicated results
    # LOG.error("QUERY: %s" % photos_query.query)
    photos = photos_query.order_by("-date").distinct()

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


@login_required
@require_http_methods(["POST"])
def upload_photo(request):
    for filename, file in request.FILES.items():
        photo_filename = "%s.jpg" % getMd5(file)
        # Doing some consistent hashing on file paths
        photo_path = getRawPath(photo_filename)

        LOG.warning("Uploading new picture %s" % photo_path)

        # If the picture/md5 already exist: override it or skip based on RAW_PHOTO_OVERRIDE_EXISTS setting
        if default_storage.exists(photo_path):
            if settings.RAW_PHOTO_OVERRIDE_EXISTS:
                # Remove to replace existing file
                default_storage.delete(photo_path)
            else:
                return Response(202, data="Picture already exist")

        _err = save_photo(file, photo_path, owner=request.user.username)
        if _err is not None:
            return ErrorUnexpected(details="save_photo - %s" % _err)

        _err = generate_photo_samples(photo_filename)
        if _err is not None:
            return ErrorUnexpected(details="%s" % _err)
        
    # from time import sleep
    #sleep(1) # Troubleshoot slow upload to work on progressbar
    return Response(201, data="Picture uploaded")

# This view is a Nginx callback url for photo without sample in the cache (if someone removed it).
# If the raw image file exist, it will regenerate the sample and serve it.
@require_http_methods(["GET"])
def resample_photo(request):
    requested_file = request.GET.get("uri")
    if requested_file is None:
        return HttpResponseNotFound("404 Error: Picture not found")
    
    # Check if the Raw file Exist
    # The name has to be at least 3 char for consistent hashing. And less should not be possible as cached files should
    # Come from uploaded md5 filename
    filename = basename(requested_file)
    if len(filename) < 3:
        return HttpResponseNotFound("404 Error: Picture not found")

    raw_photo_path = getRawPath(filename)

    if not default_storage.exists(raw_photo_path):
        LOG.warning("Unable to resample file, the raw file does not exist %s" % raw_photo_path)
        return HttpResponseNotFound("404 Error: Picture not found")

    # The raw file exist, resample it and return it
    LOG.warning("Sample missing, resample file %s" % raw_photo_path)

    _err = generate_photo_samples(filename)
    if _err is not None:
        return ErrorUnexpected(details="%s" % _err)

    # Remove the /static/ from the generated hardcoded url
    file_path = re.sub(r"^/static/", '', requested_file)

    # Ensure the sample exist, if not return 404
    if not default_storage.exists(file_path):
        LOG.warning("The requested sample file does not exist %s" % file_path)
        return HttpResponseNotFound("404 Error: Picture not found")
    return HttpResponse(default_storage.open(file_path).read(), content_type="image/jpeg")


    # SQUARE VERSION If needed for a square version
    # Simply implement a type in SAMPLE_PHOTOS_SETTINGS with a if condition to do this or thumnails
    # def crop_center(pil_img, crop_width, crop_height):
    #     img_width, img_height = pil_img.size
    #     return pil_img.crop(((img_width - crop_width) // 2,
    #                          (img_height - crop_height) // 2,
    #                          (img_width + crop_width) // 2,
    #                          (img_height + crop_height) // 2))
    # def crop_max_square(pil_img):
    #     return crop_center(pil_img, min(pil_img.size), min(pil_img.size))
    # im_thumb = crop_max_square(im).resize((thumb_width, thumb_width), Image.LANCZOS)
    # im_thumb.save('data/dst/astronaut_thumbnail_max_square.jpg', quality=95)


        # # Here we could restrict image to JPEG
        # LOG.warning(image_raw.format)
        # LOG.warning(image_raw.size)
        # # Generic info such as icc profile and dpi
        # LOG.warning(image.info.keys())
        # # Basic tags
        # exif = image.getexif()
        # for k, v in exif.items():
        #     LOG.warning("%s %s" % (ExifTags.TAGS.get(k, k),v))
        # # Advanced tags (camera infos)
        # exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
        # for k, v in exif_ifd.items():
        #     LOG.warning("IFD: %s %s" % (ExifTags.TAGS.get(k, k),v))

