from django.db import IntegrityError
from .logger import LOG
from .utils import *
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
import re
from django.http import HttpResponseNotFound, HttpResponse
from django.core.files.storage import default_storage
from os.path import basename
from . import models
#
# TROUBLESHOOTING SECTION
#

# Test private page
# TODO remove this view
@login_required
def index(request):
    return Response(data="service running - private url")

# Test public page
# TODO remove this view
def public_index(request):
    # tg = TagGroup(name="lieux")
    # tg2 = TagGroup(name="personne", color="#57d979")

    # for i in [tg, tg2]:
    #     try:
    #         i.save()
    #     except IntegrityError as e:
    #         if e.args[0] != 1062: # Duplicate entry
    #             return ErrorUnexpected(details="%s" % e)

    # t = Tag(name="hawaii", tag_group=TagGroup.objects.get(name="lieux"))
    # t2 = Tag(name="gael", color="#a8325e", tag_group=TagGroup.objects.get(name="personne"))
    # t3 = Tag(name="elo", description="coucou", tag_group=TagGroup.objects.get(name="personne"))

    # for i in [t, t2, t3]:
    #     try:
    #         i.save()
    #     except IntegrityError as e:
    #         if e.args[0] != 1062: # Duplicate entry
    #             return ErrorUnexpected(details="%s" % e)

    # # import datetime
    # # d = datetime.date(1997, 10, 19)
    # p = Photo(owner="gael", description="this is a photo", published=True, filename="3fa4f022acdb72b520bfe4bc492325dd.jpg")
    # try:
    #     p.save()
    #     p.tags.add(Tag.objects.get(name="hawaii"))
    #     p.tags.add(Tag.objects.get(name="gael"))
    #     e = Exif(name="foo", value="bar", photo=Photo.objects.get(filename="3fa4f022acdb72b520bfe4bc492325dd.jpg"))
    #     e.save()
    # except IntegrityError as e:
    #     if e.args[0] != 1062: return ErrorUnexpected(details="%s" % e)

    # p2 = Photo(owner="elo", filename="325dd.jpg")
    # try:
    #     p.save()
    # except IntegrityError as e:
    #     if e.args[0] != 1062: return ErrorUnexpected(details="%s" % e)

    return Response(data="service running")
    
#
# Photo computing
#
from time import sleep
@login_required
@require_http_methods(["POST"])
def upload_photo(request):

    # LOG.error("%s" % request.FILES)
    # LOG.error("%s" % settings.RAW_PHOTOS)
    # print(dir(request))
    for filename, file in request.FILES.items():
        photo_filename = "%s.jpg" % getMd5(file)
        # Doing some consistent hashing on file paths
        photo_path = getRawPath(photo_filename)

        LOG.warning("Uploading new picture %s" % photo_path)

        # If the picture/md5 already exist, skip
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



#
# Auth
#
@require_http_methods(["GET"])
def is_authenticated(request):
    LOG.error("--- is_authenticated from %s" % request)
    if request.user.is_authenticated:
        return Response(data="User is authenticated")
    else:
        return ErrorAuthRequired()

from django.middleware.csrf import get_token
def get_csrf(request):
    # Just by doing this get_token, django will set a csrf cookie to the client
    get_token(request)
    return Response(data="Getting csrf token")


from django.contrib.auth import authenticate, login
@require_http_methods(["POST"])
def user_login(request):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    username = post.get("username", "")
    password = post.get("password", "")
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response(202, "success")
    LOG.error("Fail login with user: %s" % username)
    return ErrorLoginFail()


from django.contrib.auth import logout
@require_http_methods(["GET"])
def user_logout(request):
    logout(request)
    return Response(440, {})

# from django.core import serializers
#     photos = models.Photo.objects.filter(published=False).all()
#     data = serializers.serialize('python', photos)

from django.forms.models import model_to_dict

#
# Photo display
#
@login_required
@require_http_methods(["GET"])
def get_unpublished(request):
    photos = models.Photo.objects.filter(published=False).order_by("-date").all()
    
    # excludes = ["id", "description", "published"]
    # data = [ model_to_dict(i, exclude=excludes) for i in photos ]
    fields = ["filename", "date", "owner", "height", "width"]
    
    data_photos = []
    for p in photos:
        _p = model_to_dict(p, fields=fields)
        _p["hash_path"] = genHasingPath(_p["filename"])
        data_photos.append(_p)
    data = { "photos": data_photos,
             "paths": get_photo_root_paths() }

    return Response(200, data=data)
# for e in Entry.objects.all():
#     print(e.headline)