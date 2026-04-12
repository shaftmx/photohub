from ..logger import LOG
from ..utils import *
from django.views.decorators.http import require_http_methods
from .. import models
from django.forms.models import model_to_dict


def _serialize_view(v):
    """Return a dict representation of a View instance."""
    data = {
        "id": v.id,
        "name": v.name,
        "owner": v.owner,
        "description": v.description,
        "public": v.public,
        "sort_by": v.sort_by,
        "sort_dir": v.sort_dir,
        "filter_mode": v.filter_mode,
        "filter_favorite": v.filter_favorite,
        "filter_rating_value": v.filter_rating_value,
        "filter_rating_mode": v.filter_rating_mode,
        "cover_filename": v.cover.filename if v.cover else None,
        "cover_hash_path": genHasingPath(v.cover.filename) if v.cover else None,
        "filter_tags": [
            {"id": t.id, "name": t.name, "color": t.color or t.tag_group.color, "group_name": t.tag_group.name}
            for t in v.filter_tags.all()
        ],
    }
    return data


def _apply_view_filters(v):
    """Apply a View's saved filters to a Photo queryset and return matching photos."""
    photos_query = models.Photo.objects.filter(published=True)

    if v.filter_mode == 'notags':
        photos_query = photos_query.filter(tags__isnull=True)
    else:
        # Group selected tags by tag_group for filter logic
        filter_tags_by_group = {}
        for tag in v.filter_tags.all():
            group_name = tag.tag_group.name
            if group_name not in filter_tags_by_group:
                filter_tags_by_group[group_name] = []
            filter_tags_by_group[group_name].append(tag)

        if filter_tags_by_group:
            if v.filter_mode == 'smart':
                # OR within group, AND across groups
                for group, tags in filter_tags_by_group.items():
                    photos_query = photos_query.filter(tags__in=tags)
            else:
                # basic: AND on every tag
                for group, tags in filter_tags_by_group.items():
                    for tag in tags:
                        photos_query = photos_query.filter(tags=tag)

    if v.filter_favorite is True:
        photos_query = photos_query.filter(favorite=True)

    if v.filter_rating_value and v.filter_rating_value > 0:
        if v.filter_rating_mode == 'eq':
            photos_query = photos_query.filter(rating=v.filter_rating_value)
        elif v.filter_rating_mode == 'gte':
            photos_query = photos_query.filter(rating__gte=v.filter_rating_value, rating__gt=0)
        else:  # lte
            photos_query = photos_query.filter(rating__lte=v.filter_rating_value, rating__gt=0)

    return apply_sort(photos_query, v.sort_by, v.sort_dir).distinct()


def _serialize_photo(p):
    fields = ["filename", "date", "owner", "height", "width", "tags", "favorite", "rating", "origin_filename"]
    _p = model_to_dict(p, fields=fields)
    _p["upload_date"] = p.upload_date.isoformat() if p.upload_date else ""
    _p["tags"] = {}
    for t in p.tags.all():
        group = t.tag_group.name
        if group not in _p["tags"]:
            _p["tags"][group] = []
        _p["tags"][group].append(t.name)
    _p["hash_path"] = genHasingPath(_p["filename"])
    return _p


#
# GET /api/views — list all views with photo count
#
@login_required
@require_http_methods(["GET"])
def list_views(request):
    views = models.View.objects.filter(owner=request.user.username).order_by('name')
    data = []
    for v in views:
        v_data = _serialize_view(v)
        photos_qs = _apply_view_filters(v)
        v_data["photo_count"] = photos_qs.count()
        # Cover: use first matching photo if no explicit cover, or if explicit cover is no longer in filtered results
        if not v.cover or not photos_qs.filter(filename=v.cover.filename).exists():
            first = photos_qs.first()
            v_data["cover_filename"] = first.filename if first else None
            v_data["cover_hash_path"] = genHasingPath(first.filename) if first else None
        data.append(v_data)
    return Response(200, data={"views": data, "paths": get_photo_root_paths()})


#
# POST /api/views — create a new view
#
@login_required
@require_http_methods(["POST"])
def create_view(request):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    name = post.get("name", "").strip()
    if not name:
        return ErrorRequest(details="name is required")

    v = models.View(
        name=name,
        owner=request.user.username,
        description=post.get("description", ""),
        public=bool(post.get("public", False)),
        sort_by=post.get("sort_by", "date"),
        sort_dir=post.get("sort_dir", "desc"),
        filter_mode=post.get("filter_mode", "basic"),
        filter_favorite=post.get("filter_favorite"),  # None / True
        filter_rating_value=int(post.get("filter_rating_value", 0)),
        filter_rating_mode=post.get("filter_rating_mode", "gte"),
    )
    v.save()

    # Cover photo
    cover_filename = post.get("cover_filename")
    if cover_filename:
        try:
            v.cover = models.Photo.objects.get(filename=cover_filename)
            v.save()
        except models.Photo.DoesNotExist:
            pass

    # Attach filter tags (list of tag names)
    tag_names = post.get("filter_tag_names", [])
    if tag_names:
        tags = models.Tag.objects.filter(name__in=tag_names)
        v.filter_tags.set(tags)

    LOG.info("Created view '%s' (id=%s)" % (v.name, v.id))
    return Response(201, data={"view": _serialize_view(v)})


#
# GET /api/views/<id> — get view detail
#
@login_required
@require_http_methods(["GET"])
def get_view(request, view_id):
    try:
        v = models.View.objects.get(id=view_id, owner=request.user.username)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    return Response(200, data={"view": _serialize_view(v)})


#
# POST /api/views/<id>/update — update a view
#
@login_required
@require_http_methods(["POST"])
def update_view(request, view_id):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    try:
        v = models.View.objects.get(id=view_id, owner=request.user.username)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    if "name" in post:
        v.name = post["name"].strip()
    if "description" in post:
        v.description = post["description"]
    if "public" in post:
        v.public = bool(post["public"])
    if "sort_by" in post:
        v.sort_by = post["sort_by"]
    if "sort_dir" in post:
        v.sort_dir = post["sort_dir"]
    if "filter_mode" in post:
        v.filter_mode = post["filter_mode"]
    if "filter_favorite" in post:
        v.filter_favorite = post["filter_favorite"]
    if "filter_rating_value" in post:
        v.filter_rating_value = int(post["filter_rating_value"])
    if "filter_rating_mode" in post:
        v.filter_rating_mode = post["filter_rating_mode"]

    # Cover photo
    if "cover_filename" in post:
        if post["cover_filename"]:
            try:
                v.cover = models.Photo.objects.get(filename=post["cover_filename"])
            except models.Photo.DoesNotExist:
                pass
        else:
            v.cover = None

    v.save()

    # Update filter tags if provided
    if "filter_tag_names" in post:
        tag_names = post["filter_tag_names"]
        tags = models.Tag.objects.filter(name__in=tag_names)
        v.filter_tags.set(tags)

    return Response(200, data={"view": _serialize_view(v)})


#
# POST /api/views/<id>/delete — delete a view
#
@login_required
@require_http_methods(["POST"])
def delete_view(request, view_id):
    try:
        v = models.View.objects.get(id=view_id, owner=request.user.username)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    v.delete()
    LOG.info("Deleted view id=%s" % view_id)
    return Response(200, "success")


#
# GET /api/views/<id>/photos — photos matching this view's filters
#
@login_required
@require_http_methods(["GET"])
def get_view_photos(request, view_id):
    try:
        v = models.View.objects.get(id=view_id, owner=request.user.username)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    photos = _apply_view_filters(v)
    data_photos = [_serialize_photo(p) for p in photos]
    v_data = _serialize_view(v)

    # Edge case: if explicit cover no longer exists in filtered photos, fallback to first
    photo_filenames = {p["filename"] for p in data_photos}
    if v_data["cover_filename"] and v_data["cover_filename"] not in photo_filenames:
        first = photos.first()
        v_data["cover_filename"] = first.filename if first else None
        v_data["cover_hash_path"] = genHasingPath(first.filename) if first else None

    return Response(200, data={
        "photos": data_photos,
        "paths": get_photo_root_paths(),
        "view": v_data,
    })
