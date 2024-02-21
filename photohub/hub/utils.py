from .logger import LOG
from .errors import *
from django.contrib.auth import authenticate
from django.http import JsonResponse
import json
import hashlib
from os.path import join as p_join
from django.conf import settings
from PIL import Image, ExifTags, ImageCms
from django.core.files.storage import default_storage
from django.conf import settings
from os.path import basename

# Login required
def login_required(func):
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        request = args[0]
        if not request.user.is_authenticated:
            return ErrorAuthRequired()
        return ret 
    return wrapper

#Response
def Response(status=200, data={}):
    return JsonResponse({"status": status, "data": data}, status=status)

#
# Tools
#
def json_decode(body):
    "Decode json to python"
    try:
        res = json.loads(body)
        return res, None
    except Exception as e:
        return None, str("Json decode error %s" % e)

def getMd5(file):
    "Get md5sum from a open() file"
    m = hashlib.md5()
    file.seek(0) # Ensure we are at the beginning of the file
    m.update(file.read())
    file.seek(0) # Reset it just in case to avoid potential side effects
    md5code = m.hexdigest()
    return md5code

def getSamplePath(filename, samplename):
    "return the sample path for a given filename eg cache/samples/xs/0/1/01234.jpg"
    return p_join(settings.SAMPLE_PHOTOS_PATH, samplename, genHasingPath(filename), filename)

def getRawPath(filename):
    "return the raw path for a given filename eg raw/0/1/01234.jpg"
    return p_join(settings.RAW_PHOTOS_PATH, genHasingPath(filename), filename)

def genHasingPath(filename):
    "Generate consistent hashing path for a filename eg for 01234.jpg 0/1"
    return p_join(filename[0], filename[1])

def get_photo_root_paths():
    paths = {"raw": p_join("/", basename(settings.MEDIA_ROOT), settings.RAW_PHOTOS_PATH)}
    for sample in settings.SAMPLE_PHOTOS_SETTINGS:
        paths[sample["name"]] = p_join("/", basename(settings.MEDIA_ROOT), settings.SAMPLE_PHOTOS_PATH, sample["name"])
    return paths


# GPS From https://gis.stackexchange.com/questions/379093/identifying-coordinate-format-from-exif-data
def dms_to_dd(gps_coords, gps_coords_ref):
    d, m, s =  gps_coords
    dd = d + m / 60 + s / 3600
    if gps_coords_ref.upper() in ('S', 'W'):
        return float(-dd)
    elif gps_coords_ref.upper() in ('N', 'E'):
        return float(dd)
    else:
        raise RuntimeError('Incorrect gps_coords_ref {}'.format(gps_coords_ref))

#
# Write photos
#
from django.core.files.base import File
from io import BytesIO


def generate_photo_samples(filename):
    "Generate all photo samples from a raw file path"
    raw_photo_path =  getRawPath(filename)
    try:
        image_raw = Image.open(default_storage.open(raw_photo_path))
        icc_profile = image_raw.info.get("icc_profile")
        # If this process is really slow, we could thing of doing the thumbnail from the previous size instead of raw each time
        for sample in sorted(settings.SAMPLE_PHOTOS_SETTINGS, key=lambda d: d['max_size'], reverse=True):
            image_sample = image_raw.copy()
            max_size = (sample["max_size"], sample["max_size"])
            image_sample.thumbnail(size=max_size)
            sample_path = getSamplePath(filename, sample["name"])
            
            # PIL .save require a file. But the file is not created yet.
            # First implementation to give a file was done with default_storage.open(sample_path, "w+"). But
            # at some point it failed because open can't create recursivly directories.
            # In order to fake PIL an open file we used Django file (to provide a filename, required to define extention and save format)
            # Then default_storage.save actually create the file and required directories
            sample_file = File(BytesIO(), name=sample_path)
            image_sample.save(sample_file, quality=sample["quality"], icc_profile=icc_profile)  
            # Refresh all samples, remove existing   
            if default_storage.exists(sample_path):
                default_storage.delete(sample_path)
            default_storage.save(sample_path, sample_file)
        return
    except Exception as e:
        return e


def save_photo(file, photo_path, owner):
    try:
        with Image.open(file) as image_raw:
            if image_raw.format != "JPEG":
                return Exception("Image format not supported %s" % image_raw.format)

        write_raw_photo(file, photo_path)
        create_photo_in_db(file, basename(photo_path), owner)
        return
    except Exception as e:
        return e

def write_raw_photo(file, photo_path):
    # If no QUALITY or MAX SIZE restriction simply save the file
    if settings.RAW_PHOTOS_QUALITY is not None or settings.RAW_PHOTOS_MAX_SIZE is not None:
        quality = settings.RAW_PHOTOS_QUALITY or "keep"
        with Image.open(file) as image_raw:
            icc_profile = image_raw.info.get("icc_profile")
            quality = settings.RAW_PHOTOS_QUALITY or "keep"

            if settings.RAW_PHOTOS_MAX_SIZE is not None:
                max_size = (settings.RAW_PHOTOS_MAX_SIZE,settings.RAW_PHOTOS_MAX_SIZE)
                image_raw.thumbnail(size=max_size)

             # Same in Memory hack as generatePhotoSamples
            # I tried first to image_raw.save in the original raw_file. But it produce a file bigger than simple save wierd
            # So doing the same thing as the sample going through a BytesIO
            sample_file = File(BytesIO(), name=photo_path)
            image_raw.save(sample_file, quality=quality, icc_profile=icc_profile)  
            default_storage.save(photo_path, sample_file)
            return
    default_storage.save(photo_path, file)


from PIL.ExifTags import GPSTAGS
def get_exif(file):
    exifs = {}
    with Image.open(file) as image:
        exif = image.getexif()
        exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)

        exifs["DPI"] = image.info.get("dpi")[0]
        exifs["Width"] = image.width
        exifs["Height"] = image.height

        #Base
        exifs["Make"] = exif.get(ExifTags.Base.Make)
        exifs["Model"] = exif.get(ExifTags.Base.Model)
        exifs["DateTime"] = exif.get(ExifTags.Base.DateTime)

        # IFD
        exifs["ExifVersion"] = exif_ifd.get(ExifTags.Base.ExifVersion)
        exifs["FNumber"] = exif_ifd.get(ExifTags.Base.FNumber)
        exifs["DateTimeOriginal"] = exif_ifd.get(ExifTags.Base.DateTimeOriginal)
        exifs["ISOSpeedRatings"] = exif_ifd.get(ExifTags.Base.ISOSpeedRatings)
        exifs["LensModel"] = exif_ifd.get(ExifTags.Base.LensModel)
        exifs["ExposureTime"] = exif_ifd.get(ExifTags.Base.ExposureTime)

        # Convert ExposureTime to human readable string
        if exifs["ExposureTime"] is not None: exifs["ExposureTime"]  = str(exifs["ExposureTime"].real)

        # GPS
        gps_ifd = exif.get_ifd(ExifTags.Base.GPSInfo)
        if gps_ifd != {}:            
            exifs["GPSAltitude"] = gps_ifd.get(ExifTags.GPS.GPSAltitude, 0)
            exifs["GPSLatitudeRef"] = gps_ifd.get(ExifTags.GPS.GPSLatitudeRef)

            lat = [str(float(i)) for i in gps_ifd.get(ExifTags.GPS.GPSLatitude)]
            exifs["GPSLatitude"] = ";".join(lat)
            exifs["GPSLongitudeRef"] = gps_ifd.get(ExifTags.GPS.GPSLongitudeRef)
            long =  [str(float(i)) for i in gps_ifd.get(ExifTags.GPS.GPSLongitude)]
            exifs["GPSLongitude"] = ";".join(long)
            # DD format
            exifs["GPSDDFormat"] = "%s %s" % (dms_to_dd(gps_ifd.get(ExifTags.GPS.GPSLatitude), exifs["GPSLatitudeRef"]),
                                              dms_to_dd(gps_ifd.get(ExifTags.GPS.GPSLongitude), exifs["GPSLongitudeRef"]))
    
            # Not working DMS Gmap 48°56'05.4"N 2°12'21.1"E
            # exifs["GPSDMS"] = "%s°%s'%s\"%s %s°%s'%s\"%s" % (int(float(lat[0])), int(float(lat[1])), lat[2], exifs["GPSLatitudeRef"],
            #                                                         int(float(long[0])), int(float(long[1])), long[2], exifs["GPSLongitudeRef"])
            # 'GPSTimeStamp': (9.0, 36.0, 57.0),
            # 'GPSImgDirectionRef': 'M',
            # 'GPSImgDirection': 43.0,
            # 'GPSDateStamp': '2023:08:08'}

        # Filter None values
        exifs = {k: str(v) for k, v in exifs.items() if v is not None }

        # Troubleshooting display all exifs
        # # GPS
        # gps_ifd = exif.get_ifd(ExifTags.Base.GPSInfo)
        # gps_info = {}
        # LOG.warning(gps_ifd)
        # for k, v in gps_ifd.items():
        #     decode = GPSTAGS.get(k,k)
        #     gps_info[decode] = v
        # LOG.warning("-------GPS--")
        # LOG.warning(gps_info)

        # # Base
        # for k, v in exif.items():
        #     LOG.warning("%s %s" % (ExifTags.TAGS.get(k, k),v))
        # LOG.warning("-----------------------------------------------")
        # # Advanced tags (camera infos)
        # exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
        # for k, v in exif_ifd.items():
        #     LOG.warning("IFD: %s %s" % (ExifTags.TAGS.get(k, k),v))
    LOG.info(exifs)
    return exifs


from django.utils import timezone
from . import models
from datetime import datetime
def create_photo_in_db(file, filename, owner):
        # If the picture is already in db, skip
        if models.Photo.objects.filter(filename=filename).exists():
            return

        exifs = get_exif(file)

        photoKwargs = {
            "owner": owner,
            "published": False,
            "filename": filename,
            "width": exifs["Width"],
            "height": exifs["Height"],
        }

        # Try to get the more accurate date, if nothing in exif use default upload date
        # DateTimeOriginal 2021:09:12 21:00:34
        # DateTime 2023:01:31 22:04:00
        pdate = exifs.get("DateTimeOriginal", exifs.get("DateTime"))
        if pdate is not None:
            photoKwargs["date"] = datetime.strptime(pdate, '%Y:%m:%d %H:%M:%S').astimezone(tz=timezone.utc) # Assume exif date use UTC
        LOG.info(photoKwargs)
        p, _ = models.Photo.objects.get_or_create(**photoKwargs)

        es = []
        for k, v in exifs.items():
          es.append(models.Exif(name=k, value=v, photo=p))
        e = models.Exif.objects.bulk_create(es)


#
# Tagging
#

def batch_apply_tags(current, staging, photos):
    # Add or remove tags comparing current and staging tags
    tags_to_add = []
    tags_to_delete = []
    all_tag_groups = set(list(current.keys()) + list(staging.keys()))
    for group_name in all_tag_groups:
        # Get the group
        old_tags = current.get(group_name, [])
        new_tags = staging.get(group_name, [])

        tags_name_to_add = [x for x in new_tags if x not in old_tags]
        tags_name_to_delete = [x for x in old_tags if x not in new_tags]

        # Tags to ADD
        for tag_name in tags_name_to_add:
            tag = models.Tag.objects.filter(name=tag_name).first()
            if tag is None:
                try:
                    _group = models.TagGroup.objects.get(name=group_name)
                    _new_tag = models.Tag(name=tag_name, tag_group=_group)
                    _new_tag.save()
                    tags_to_add.append(_new_tag)
                    continue
                except IntegrityError as e:
                    return ErrorUnexpected(details="%s" % e)
            tags_to_add.append(tag)

        # Tags to DELETE
        for tag_name in tags_name_to_delete:
            tag = models.Tag.objects.filter(name=tag_name).first()
            tags_to_delete.append(tag)

    LOG.info("Common tags to add %s" % tags_to_add)
    LOG.info("Common tags to delete %s" % tags_to_delete)
    for photo_filename in photos:
        LOG.debug("Common tags handling %s" % photo_filename)
        photo = models.Photo.objects.get(filename=photo_filename)
        photo.tags.add(*tags_to_add)
        photo.tags.remove(*tags_to_delete)

    return None











        # p = Photo(owner=owner, published=False, filename=filename)
        # p.save()
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

        # Photo.date = DateTimeOriginal or DateTime


        # LOG.warning(models.Photo.objects.filter(filename="3fa4f022a2b520bfe4bc492325dd.jpg").exists())


# p = Article.objects.order_by("title", "pub_date").first()
# last()
# Entry.objects.filter(pub_date__year=2010).update(comments_on=False)

# e = Entry.objects.get(id=10)
# e.comments_on = False
# e.save()
#Instead 
# Entry.objects.filter(id=10).update(comments_on=False)

# try:
#     obj = Person.objects.get(first_name="John", last_name="Lennon")
# except Person.DoesNotExist:
#     obj = Person(first_name="John", last_name="Lennon", birthday=date(1940, 10, 9))
#     obj.save()


# if some_queryset.exists():

        # photo=models.Photo.objects.filter(filename="3fa4f022a2b520bfe4bc492325dd.jpg")
        # photo=models.Photo.objects.get(filename="3fa4f022a2b520bfe4bc492325dd.jpg")
        # LOG.error(photo)

        # Generate entry in the db for the filename (if not already exist)
        # Should be based on filename, with info such as original size, icc profile, and exif / date / gps location

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

        # Photo.date = DateTimeOriginal or DateTime


    # p = Photo(owner="gael", description="this is a photo", published=True, filename="3fa4f022acdb72b520bfe4bc492325dd.jpg")
    # try:
    #     p.save()
    #     p.tags.add(Tag.objects.get(name="hawaii"))
    #     p.tags.add(Tag.objects.get(name="gael"))
    #     e = Exif(name="foo", value="bar", photo=Photo.objects.get(filename="3fa4f022acdb72b520bfe4bc492325dd.jpg"))
    #     e.save()

