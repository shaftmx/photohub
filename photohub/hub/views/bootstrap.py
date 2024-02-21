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
# Bootstrap
#
def bootstrap(request):

    tgs = [models.TagGroup(name="pays", description="List des pays", color="red"),
            models.TagGroup(name="types", description="Types de paysages"),
            models.TagGroup(name="villes", color="blue", type="combobox")]

    for i in tgs:
        try:
            i.save()
        except IntegrityError as e:
            if e.args[0] != 1062: # Duplicate entry
                return ErrorUnexpected(details="%s" % e)


    tg_pays = models.TagGroup.objects.get(name="pays")
    tg_type = models.TagGroup.objects.get(name="types")
    tg_ville = models.TagGroup.objects.get(name="villes")
    ts = [
        # Pays
        models.Tag(name="Hawaii", color="yellow", tag_group=tg_pays),
        models.Tag(name="USA", tag_group=tg_pays),
        models.Tag(name="Reunion", description="Ile de la reunion", tag_group=tg_pays),
        # Types
        models.Tag(name="Montagne", tag_group=tg_type),
        models.Tag(name="Plage", tag_group=tg_type),
        # Villes
        models.Tag(name="Paris", description="france", color="green", tag_group=tg_ville),

    ]

    for i in ts:
        try:
            i.save()
        except IntegrityError as e:
            if e.args[0] != 1062: # Duplicate entry
                return ErrorUnexpected(details="%s" % e)

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

    return Response(data="Bootstraped")

