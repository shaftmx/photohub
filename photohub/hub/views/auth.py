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
