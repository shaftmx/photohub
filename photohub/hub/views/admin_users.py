from django.contrib.auth.models import User, Group
from django.views.decorators.http import require_http_methods
from ..utils import admin_required, get_role, json_decode, Response
from ..errors import ErrorRequest, ErrorUnexpected
from .. import models


@admin_required
@require_http_methods(["GET"])
def list_users(request):
    users = User.objects.all().order_by('username')
    data = [{"id": u.id, "username": u.username, "role": get_role(u)} for u in users]
    return Response(data=data)


@admin_required
@require_http_methods(["POST"])
def create_user(request):
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)
    username = body.get("username", "").strip()
    password = body.get("password", "")
    if not username or not password:
        return ErrorRequest(details="username and password are required")
    role = body.get("role", "member")
    if role not in ("admin", "contributor", "member"):
        role = "member"
    try:
        user = User.objects.create_user(username=username, password=password)
        if role == "admin":
            user.is_staff = True
            user.save()
        else:
            group = Group.objects.get(name=role)
            user.groups.add(group)
    except Exception as e:
        return ErrorUnexpected(details=str(e))
    return Response(data={"id": user.id, "username": user.username, "role": role})


@admin_required
@require_http_methods(["POST"])
def delete_user(request, user_id):
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return ErrorRequest(details="User not found")
    if target.id == request.user.id:
        return ErrorRequest(details="Cannot delete your own account")
    # Reassign photos and views owned by the deleted user to the requesting admin
    admin_username = request.user.username
    models.Photo.objects.filter(owner=target.username).update(owner=admin_username)
    models.View.objects.filter(owner=target.username).update(owner=admin_username)
    target.delete()
    return Response(data={"deleted": user_id})


@admin_required
@require_http_methods(["POST"])
def set_password(request, user_id):
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)
    password = body.get("password", "")
    if not password:
        return ErrorRequest(details="password is required")
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return ErrorRequest(details="User not found")
    target.set_password(password)
    target.save()
    return Response(data="ok")


@admin_required
@require_http_methods(["POST"])
def set_role(request, user_id):
    body, err = json_decode(request.body)
    if err:
        return ErrorRequest(details=err)
    role = body.get("role")
    if role not in ("admin", "contributor", "member"):
        return ErrorRequest(details="role must be admin, contributor, or member")
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return ErrorRequest(details="User not found")
    if target.id == request.user.id and role != "admin":
        return ErrorRequest(details="Cannot demote your own admin account")

    contributor_group = Group.objects.get(name='contributor')
    member_group = Group.objects.get(name='member')
    # Clear existing group memberships before assigning the new role
    target.groups.remove(contributor_group, member_group)

    if role == "admin":
        target.is_staff = True
    else:
        target.is_staff = False
        if role == "contributor":
            target.groups.add(contributor_group)
        else:
            target.groups.add(member_group)
    target.save()
    return Response(data="ok")
