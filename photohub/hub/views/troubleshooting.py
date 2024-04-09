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

