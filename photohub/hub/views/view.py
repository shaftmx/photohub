import uuid
import zipfile
import io
import os
from django.utils import timezone
from django.http import StreamingHttpResponse
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
        "filter_media_type": v.filter_media_type,
        "cover_filename": v.cover.filename if v.cover else None,
        "cover_hash_path": genHasingPath(v.cover.filename) if v.cover else None,
        "has_custom_order": models.ViewPhotoOrder.objects.filter(view=v).exists(),
        "share_link": v.share_link or None,
        "share_link_expires_at": v.share_link_expires_at.isoformat() if v.share_link_expires_at else None,
        "upload_link": v.upload_link or None,
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

    if v.filter_media_type in ('photo', 'video'):
        photos_query = photos_query.filter(type=v.filter_media_type)

    if v.filter_rating_value and v.filter_rating_value > 0:
        if v.filter_rating_mode == 'eq':
            photos_query = photos_query.filter(rating=v.filter_rating_value)
        elif v.filter_rating_mode == 'gte':
            photos_query = photos_query.filter(rating__gte=v.filter_rating_value, rating__gt=0)
        else:  # lte
            photos_query = photos_query.filter(rating__lte=v.filter_rating_value, rating__gt=0)

    return apply_sort(photos_query, v.sort_by, v.sort_dir).distinct()


def _resolve_token(token):
    """Return (view, error_response) for a share or upload token.
    Checks existence and expiry. Returns (view, None) on success."""
    v = (
        models.View.objects.filter(share_link=token).first() or
        models.View.objects.filter(upload_link=token).first()
    )
    if not v:
        return None, ErrorResponse("InvalidToken", 403, "Invalid or revoked token")
    if v.share_link_expires_at and v.share_link_expires_at < timezone.now():
        return None, ErrorResponse("Expired", 403, "Token has expired")
    # Upload tokens also require the share_link to still be active
    if models.View.objects.filter(upload_link=token).exists() and not v.share_link:
        return None, ErrorResponse("Expired", 403, "Upload link has expired")
    return v, None


def _serialize_photo(p):
    fields = ["filename", "date", "owner", "height", "width", "tags", "favorite", "rating", "origin_filename", "type", "transcode_status", "duration"]
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
    views = models.View.objects.all().order_by('name')
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
@admin_or_contributor_required
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
        filter_media_type=post.get("filter_media_type", "all"),
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
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    return Response(200, data={"view": _serialize_view(v)})


#
# POST /api/views/<id>/update — update a view
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def update_view(request, view_id):
    post, err = json_decode(request.body)
    if err is not None:
        return ErrorRequest(details=err)

    try:
        v = models.View.objects.get(id=view_id)
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
    if "filter_media_type" in post:
        v.filter_media_type = post["filter_media_type"]

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

    # Cleanup orphan ViewPhotoOrder entries (photos no longer matching filters)
    current_filenames = set(_apply_view_filters(v).values_list('filename', flat=True))
    models.ViewPhotoOrder.objects.filter(view=v).exclude(photo__filename__in=current_filenames).delete()

    # If photo_order provided in payload, replace the custom order
    if "photo_order" in post:
        photo_order = post["photo_order"]
        models.ViewPhotoOrder.objects.filter(view=v).delete()
        if photo_order:
            for idx, filename in enumerate(photo_order):
                try:
                    photo = models.Photo.objects.get(filename=filename)
                    models.ViewPhotoOrder.objects.create(view=v, photo=photo, order=idx)
                except models.Photo.DoesNotExist:
                    pass

    return Response(200, data={"view": _serialize_view(v)})


#
# POST /api/views/<id>/delete — delete a view
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def delete_view(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    v.delete()
    LOG.info("Deleted view id=%s" % view_id)
    return Response(200, "success")


#
# GET /api/public/views — list public views (no auth required)
#
@require_http_methods(["GET"])
def list_public_views(request):
    views = models.View.objects.filter(public=True).order_by('name')
    data = []
    for v in views:
        v_data = _serialize_view(v)
        photos_qs = _apply_view_filters(v)
        v_data["photo_count"] = photos_qs.count()
        if not v.cover or not photos_qs.filter(filename=v.cover.filename).exists():
            first = photos_qs.first()
            v_data["cover_filename"] = first.filename if first else None
            v_data["cover_hash_path"] = genHasingPath(first.filename) if first else None
        data.append(v_data)
    return Response(200, data={"views": data, "paths": get_photo_root_paths()})


#
# GET /api/public/views/<id>/photos — unauthenticated access for public views
#
@require_http_methods(["GET"])
def get_public_view_photos(request, view_id):
    try:
        v = models.View.objects.get(id=view_id, public=True)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found or not public")

    return _build_view_photos_response(request, v)


# GET /api/views/<id>/photos — photos matching this view's filters
#
@login_required
@require_http_methods(["GET"])
def get_view_photos(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    return _build_view_photos_response(request, v)


def _build_view_photos_response(request, v):
    filtered_qs = _apply_view_filters(v)

    # Allow overriding media_type via URL param (UI toggle, does not change saved view)
    media_type_override = request.GET.get('media_type')
    if media_type_override in ('photo', 'video'):
        filtered_qs = filtered_qs.filter(type=media_type_override)

    v_data = _serialize_view(v)

    # Custom order: if sort_by == 'custom' (view default or overridden by query param) AND records exist
    sort_by_override = request.GET.get('sort_by')
    effective_sort_by = sort_by_override if sort_by_override else v.sort_by
    custom_order_qs = models.ViewPhotoOrder.objects.filter(view=v).select_related('photo').order_by('order')
    if effective_sort_by == 'custom' and custom_order_qs.exists():
        filtered_filenames = set(filtered_qs.values_list('filename', flat=True))
        ordered = [vpo.photo for vpo in custom_order_qs if vpo.photo.filename in filtered_filenames]
        ordered_filenames = {p.filename for p in ordered}
        for p in filtered_qs:
            if p.filename not in ordered_filenames:
                ordered.append(p)
        data_photos = [_serialize_photo(p) for p in ordered]
    else:
        data_photos = [_serialize_photo(p) for p in filtered_qs]

    # Edge case: if explicit cover no longer exists in filtered photos, fallback to first
    photo_filenames = {p["filename"] for p in data_photos}
    if v_data["cover_filename"] and v_data["cover_filename"] not in photo_filenames:
        first = data_photos[0] if data_photos else None
        v_data["cover_filename"] = first["filename"] if first else None
        v_data["cover_hash_path"] = genHasingPath(first["filename"]) if first else None

    return Response(200, data={
        "photos": data_photos,
        "paths": get_photo_root_paths(),
        "view": v_data,
    })


#
# POST /api/views/<id>/share-link — generate or regenerate a share token
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def generate_share_link(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    body, _ = json_decode(request.body)
    v.share_link = str(uuid.uuid4())
    v.share_link_expires_at = _parse_expires_at(body.get("expires_at") if body else None)
    v.save()
    return Response(200, data={"share_link": v.share_link, "share_link_expires_at": v.share_link_expires_at.isoformat() if v.share_link_expires_at else None})


def _parse_expires_at(value):
    """Parse an ISO datetime string to an aware datetime, or return None."""
    if not value:
        return None
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            from django.utils.timezone import make_aware
            dt = make_aware(dt)
        return dt
    except (ValueError, AttributeError):
        return None


#
# POST /api/views/<id>/share-link/expiry — update expiry without changing the token
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def set_share_link_expiry(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)

    v.share_link_expires_at = _parse_expires_at(body.get("expires_at"))
    v.save()
    return Response(200, data={"share_link_expires_at": v.share_link_expires_at.isoformat() if v.share_link_expires_at else None})


#
# POST /api/views/<id>/share-link/revoke — revoke the share token
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def revoke_share_link(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    v.share_link = ''
    v.share_link_expires_at = None
    v.upload_link = ''
    v.save()
    return Response(200, data={"share_link": None, "share_link_expires_at": None, "upload_link": None})


#
# GET /api/shared_view/<token>/photos
# GET /api/upload_view/<token>/photos
#
@require_http_methods(["GET"])
def get_view_photos_by_token(request, token):
    v, err = _resolve_token(token)
    if err:
        return err
    return _build_view_photos_response(request, v)


#
# GET /api/views/<id>/download?size=<size> — stream a ZIP of all photos in the view
#
@login_required
@require_http_methods(["GET"])
def download_view_zip(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    size = request.GET.get('size', 'xs')
    photos = list(_apply_view_filters(v))

    def _get_photo_path(filename):
        if size == 'raw':
            return p_join(settings.MEDIA_ROOT, getRawPath(filename))
        return p_join(settings.MEDIA_ROOT, getSamplePath(filename, size))

    def zip_generator():
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode='w', compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
            for photo in photos:
                path = _get_photo_path(photo.filename)
                if os.path.exists(path):
                    zf.write(path, arcname=photo.filename)
        yield buf.getvalue()

    safe_name = "".join(c if c.isalnum() or c in "-_ " else "_" for c in v.name).strip()
    filename = f"{safe_name}_{size}.zip"
    response = StreamingHttpResponse(zip_generator(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


#
# POST /api/views/<id>/upload-link — generate or regenerate upload token
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def generate_upload_link(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    if not v.share_link:
        return ErrorResponse("NoShareLink", 400, "A share link must exist before generating an upload link")

    v.upload_link = str(uuid.uuid4())
    v.save()
    return Response(200, data={"upload_link": v.upload_link})


#
# POST /api/views/<id>/upload-link/revoke — revoke upload token
#
@admin_or_contributor_required
@require_http_methods(["POST"])
def revoke_upload_link(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")

    v.upload_link = ''
    v.save()
    return Response(200, data={"upload_link": None})


#
# POST /api/upload_view/<token>/upload — upload a photo in the view context
#
@require_http_methods(["POST"])
def upload_view_photo(request, token):
    v, err = _resolve_token(token)
    if err:
        return err

    uploaded = []
    for field_name, file in request.FILES.items():
        photo_filename = "%s.jpg" % getMd5(file)
        photo_path = getRawPath(photo_filename)

        if default_storage.exists(photo_path):
            if not get_setting('RAW_PHOTO_OVERRIDE_EXISTS'):
                uploaded.append(photo_filename)
                continue
            default_storage.delete(photo_path)

        err = save_photo(file, photo_path, owner="guest")
        if err is not None:
            return ErrorUnexpected(details="save_photo '%s' - %s" % (file.name, err), trace=err)

        if get_setting('GENERATE_SAMPLES_ON_UPLOAD'):
            generate_photo_samples(photo_filename)

        # Auto-apply view filter tags and publish
        photo = models.Photo.objects.get(filename=photo_filename)
        photo.published = True
        photo.save()
        for tag in v.filter_tags.all():
            photo.tags.add(tag)

        uploaded.append(photo_filename)

    return Response(201, data={"uploaded": len(uploaded)})


#
# GET /api/public/views/<view_id>/photos/<filename> — photo detail for public views
#
@require_http_methods(["GET"])
def get_public_view_photo_detail(request, view_id, filename):
    from .photo_actions import _serialize_photo_detail
    try:
        v = models.View.objects.get(id=view_id, public=True)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    if not _apply_view_filters(v).filter(filename=filename).exists():
        return ErrorResponse("NotFound", 404, "Photo not found in this view")
    try:
        p = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")
    return _serialize_photo_detail(p)


#
# GET /api/token/<token>/photos/<filename> — photo detail via share or upload token
#
@require_http_methods(["GET"])
def get_photo_detail_by_token(request, token, filename):
    from .photo_actions import _serialize_photo_detail
    v, err = _resolve_token(token)
    if err:
        return err
    if not _apply_view_filters(v).filter(filename=filename).exists():
        return ErrorResponse("NotFound", 404, "Photo not found in this view")
    try:
        p = models.Photo.objects.get(filename=filename)
    except models.Photo.DoesNotExist:
        return ErrorResponse("NotFound", 404, "Photo not found")
    return _serialize_photo_detail(p)


def _photos_with_gps(photos_qs):
    result = []
    for p in photos_qs:
        gps = models.Exif.objects.filter(photo=p, name='GPSDDFormat').first()
        if not gps:
            continue
        parts = gps.value.split()
        if len(parts) != 2:
            continue
        try:
            lat, lng = float(parts[0]), float(parts[1])
        except ValueError:
            continue
        result.append({
            "filename": p.filename,
            "hash_path": genHasingPath(p.filename),
            "origin_filename": p.origin_filename,
            "lat": lat,
            "lng": lng,
        })
    return result


#
# GET /api/views/<id>/map — photos with GPS for a view (auth required)
#
@login_required
@require_http_methods(["GET"])
def get_view_map(request, view_id):
    try:
        v = models.View.objects.get(id=view_id)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    return Response(200, data={"photos": _photos_with_gps(_apply_view_filters(v)), "paths": get_photo_root_paths()})


#
# GET /api/public/views/<id>/map — photos with GPS for a public view
#
@require_http_methods(["GET"])
def get_public_view_map(request, view_id):
    try:
        v = models.View.objects.get(id=view_id, public=True)
    except models.View.DoesNotExist:
        return ErrorResponse("NotFound", 404, "View not found")
    return Response(200, data={"photos": _photos_with_gps(_apply_view_filters(v)), "paths": get_photo_root_paths()})


#
# GET /api/token/<token>/map — photos with GPS via share or upload token
#
@require_http_methods(["GET"])
def get_token_view_map(request, token):
    v, err = _resolve_token(token)
    if err:
        return err
    return Response(200, data={"photos": _photos_with_gps(_apply_view_filters(v)), "paths": get_photo_root_paths()})
