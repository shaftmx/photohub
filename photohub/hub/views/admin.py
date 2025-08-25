from django.db import IntegrityError
from ..logger import LOG
from ..utils import *
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
import re
from django.http import HttpResponseNotFound, HttpResponse
from django.core.files.storage import default_storage
from os import makedirs
from os.path import basename, isfile
from .. import models
from django.forms.models import model_to_dict
import yaml
from os.path import join as p_join
import json


#
# dump
#
def dump(request):
    makedirs(settings.DUMP_ROOT, exist_ok=True)

    photos_query = models.Photo.objects.filter()
    #photos_query = models.Photo.objects.filter(published=True)
    # Add extra filters
    #photos_query = photos_query.filter(tags=tag)

    photos = photos_query.order_by("-date").distinct()
    # excludes = ["id", "description", "published"]
    #fields = ["filename", "date", "owner", "height", "width", "tags"]
    fields = None

    data_photos = []
    for p in photos:
        _p = model_to_dict(p, fields=fields)

        # --- TAGS ---
        _p["tags"] = {}
        for t in p.tags.all():
            _group = t.tag_group.name
            if _group not in _p["tags"]:
                _p["tags"][_group] = []
            _p["tags"][_group].append(t.name)

        # --- EXIFS ---
        _p["exifs"] = {}
        for e in models.Exif.objects.filter(photo=p):
            _p["exifs"][e.name] = e.value

        # --- Autres infos ---
        _p["hash_path"] = genHasingPath(_p["filename"])
        # Manually add this filed because auto_now_add=True and ManyToMany are ignored by model_to_dict by default
        _p["upload_date"] = p.upload_date.isoformat() if p.upload_date else None

        data_photos.append(_p)

        # === Dump YAML ===
        dump_path = p_join(settings.DUMP_ROOT, f"{p.filename}.yml")
        with open(dump_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(_p, f, allow_unicode=True, sort_keys=False)

        # === (Optionnel) Dump JSON ===
        # dump_path_json = p_join(settings.DUMP_ROOT, f"{p.filename}.json")
        # with open(dump_path_json, "w", encoding="utf-8") as f:
        #     json.dump(_p, f, ensure_ascii=False, indent=2)


    data = { "photos": data_photos,
             "paths": get_photo_root_paths() }
    
    return Response(data=data)
    #return Response(data="Dumped")
    # return JsonResponse({"status": "ok", "count": photos.count()})



#
# Bootstrap
#
def bootstrap(request):

    yaml_file = "/bootstrap/bootstrap-tags.yml"
    if not isfile(yaml_file):
        return ErrorUnexpected(details="%s File does not exist" % yaml_file)

    with open(yaml_file, "r") as f:
        data = yaml.safe_load(f)

    tag_groups = data.get("tag_groups", [])

    try:
        for tg in tag_groups:
            # update_or_create pour le TagGroup
            tag_group, _ = models.TagGroup.objects.update_or_create(
                name=tg["name"],
                defaults={
                    "description": tg.get("description", ""),
                    "color": tg.get("color"),
                    "type": tg.get("type", "checkbox"),
                },
            )

            # update_or_create pour chaque Tag
            for t in tg.get("tags", []):
                models.Tag.objects.update_or_create(
                    name=t["name"],
                    tag_group=tag_group,
                    defaults={
                        "description": t.get("description", ""),
                        "color": t.get("color"),
                    },
                )
    except IntegrityError as e:
        return ErrorUnexpected(details="%s" % e)

    return Response(data="Bootstraped")


# LEGACY MANUAL BOOTSTRAP
#    tgs = [models.TagGroup(name="pays", description="List des pays", color="red"),
#            models.TagGroup(name="types", description="Types de paysages"),
#            models.TagGroup(name="villes", color="blue", type="combobox")]
#
#    for i in tgs:
#        try:
#            i.save()
#        except IntegrityError as e:
#            if e.args[0] != 1062: # Duplicate entry
#                return ErrorUnexpected(details="%s" % e)
#
#
#    tg_pays = models.TagGroup.objects.get(name="pays")
#    tg_type = models.TagGroup.objects.get(name="types")
#    tg_ville = models.TagGroup.objects.get(name="villes")
#    ts = [
#        # Pays
#        models.Tag(name="Madere", color="yellow", tag_group=tg_pays),
#        models.Tag(name="France", tag_group=tg_pays),
#        models.Tag(name="Reunion", description="Ile de la reunion", tag_group=tg_pays),
#        # Types
#        models.Tag(name="Montagne", tag_group=tg_type),
#        models.Tag(name="Plage", tag_group=tg_type),
#        # Villes
#        models.Tag(name="Paris", description="france", color="green", tag_group=tg_ville),
#
#    ]
#
#    for i in ts:
#        try:
#            i.save()
#        except IntegrityError as e:
#            if e.args[0] != 1062: # Duplicate entry
#                return ErrorUnexpected(details="%s" % e)



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


