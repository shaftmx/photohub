"""
Admin Tags view — GET/POST /api/admin/tags

GET  — returns all tag groups and their tags as a YAML string
POST — receives a YAML string and upserts tag groups / tags into the DB

Access: admin (is_staff) or contributor group.
Note: this does NOT delete tags removed from the YAML — photos referencing
those tags would be silently orphaned. Deletion must be done explicitly.
"""
import yaml
from ..utils import admin_or_contributor_required, json_decode, Response
from ..errors import ErrorRequest, ErrorUnexpected
from .. import models


@admin_or_contributor_required
def tags_view(request):
    """Dispatcher: routes GET → _get_tags, POST → _set_tags."""
    if request.method == "GET":
        return _get_tags(request)
    elif request.method == "POST":
        return _set_tags(request)


def _get_tags(request):
    """Serialize current DB tags into a YAML string returned to the client."""
    tag_groups = models.TagGroup.objects.prefetch_related('tag_set').all().order_by('name')
    data = {"tag_groups": []}
    for tg in tag_groups:
        entry = {
            "name": tg.name,
            "type": tg.type,
            "tags": [],
        }
        # Only include optional fields when they have a value (keeps YAML clean)
        if tg.color:
            entry["color"] = tg.color
        if tg.description:
            entry["description"] = tg.description
        for t in tg.tag_set.all().order_by('name'):
            t_entry = {"name": t.name}
            if t.color:
                t_entry["color"] = t.color
            entry["tags"].append(t_entry)
        data["tag_groups"].append(entry)
    yaml_str = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return Response(data={"yaml": yaml_str})


def _set_tags(request):
    """
    Parse the submitted YAML and upsert (create or update) tag groups and tags.
    Uses update_or_create so it is safe to run multiple times.
    Does NOT remove tags that were deleted from the YAML — existing photo
    associations would break silently. Removals require explicit deletion.
    """
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)
    try:
        parsed = yaml.safe_load(body.get("yaml", ""))
    except yaml.YAMLError as e:
        return ErrorRequest(details="Invalid YAML: %s" % e)
    if not isinstance(parsed, dict) or "tag_groups" not in parsed:
        return ErrorRequest(details="YAML must contain a 'tag_groups' key")
    try:
        for tg_data in parsed.get("tag_groups", []):
            tg, _ = models.TagGroup.objects.update_or_create(
                name=tg_data["name"],
                defaults={
                    "description": tg_data.get("description", ""),
                    "color": tg_data.get("color"),
                    "type": tg_data.get("type", "checkbox"),
                }
            )
            for t_data in tg_data.get("tags", []):
                models.Tag.objects.update_or_create(
                    name=t_data["name"],
                    tag_group=tg,
                    defaults={
                        "description": t_data.get("description", ""),
                        "color": t_data.get("color"),
                    }
                )
    except Exception as e:
        return ErrorUnexpected(details=str(e))
    return Response(data="Tags updated")
