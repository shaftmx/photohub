"""
Admin Tags view — GET/POST /api/admin/tags

GET  — serializes all tag groups and tags as YAML, including their DB id.
POST — fully syncs the DB to match the submitted YAML:
         - tag/group with an id  → lookup by id, update fields (safe rename)
         - tag/group without id  → create new (lookup by name to avoid duplicates)
         - tag/group absent from YAML → deleted (M2M cascade removes photo associations)
       Renaming a tag by keeping its id preserves all photo associations.

Access: admin (is_staff) or contributor group.
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
            "id":   tg.id,
            "name": tg.name,
            "type": tg.type,
            "tags": [],
        }
        if tg.color:
            entry["color"] = tg.color
        if tg.description:
            entry["description"] = tg.description
        for t in tg.tag_set.all().order_by('name'):
            t_entry = {"id": t.id, "name": t.name}
            if t.color:
                t_entry["color"] = t.color
            entry["tags"].append(t_entry)
        data["tag_groups"].append(entry)
    yaml_str = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return Response(data={"yaml": yaml_str})


def _set_tags(request):
    """
    Parse the submitted YAML and fully sync DB (upsert + delete).

    Lookup strategy:
      - If `id` present → fetch by id, update all fields (rename-safe).
      - If no `id`      → get_or_create by name (new tag / group).
    After processing, delete any groups/tags absent from the YAML.
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
        seen_group_ids = []
        seen_tag_ids = []

        for tg_data in parsed.get("tag_groups", []):
            tg_id = tg_data.get("id")
            tg_fields = {
                "name":        tg_data["name"],
                "description": tg_data.get("description", ""),
                "color":       tg_data.get("color"),
                "type":        tg_data.get("type", "checkbox"),
            }
            if tg_id:
                try:
                    tg = models.TagGroup.objects.get(id=tg_id)
                    for k, v in tg_fields.items():
                        setattr(tg, k, v)
                    tg.save()
                except models.TagGroup.DoesNotExist:
                    tg = models.TagGroup.objects.create(**tg_fields)
            else:
                tg, _ = models.TagGroup.objects.get_or_create(
                    name=tg_data["name"], defaults=tg_fields
                )
                # update fields even if it already existed (no id provided)
                for k, v in tg_fields.items():
                    setattr(tg, k, v)
                tg.save()

            seen_group_ids.append(tg.id)

            for t_data in tg_data.get("tags", []):
                t_id = t_data.get("id")
                t_fields = {
                    "name":        t_data["name"],
                    "tag_group":   tg,
                    "description": t_data.get("description", ""),
                    "color":       t_data.get("color"),
                }
                if t_id:
                    try:
                        t = models.Tag.objects.get(id=t_id)
                        for k, v in t_fields.items():
                            setattr(t, k, v)
                        t.save()
                    except models.Tag.DoesNotExist:
                        t = models.Tag.objects.create(**t_fields)
                else:
                    t, _ = models.Tag.objects.get_or_create(
                        name=t_data["name"], tag_group=tg, defaults=t_fields
                    )
                    for k, v in t_fields.items():
                        setattr(t, k, v)
                    t.save()

                seen_tag_ids.append(t.id)

        # Delete tags and groups absent from the YAML
        models.Tag.objects.exclude(id__in=seen_tag_ids).delete()
        models.TagGroup.objects.exclude(id__in=seen_group_ids).delete()

    except Exception as e:
        return ErrorUnexpected(details=str(e))

    return Response(data="Tags updated")
