from django.urls import path

from .views import troubleshooting
from .views import auth
from .views import photo
from .views import tags
from .views import unpublished
from .views import bootstrap


urlpatterns = [
    # get_csrf token is used for security middleware. It as to be present in POST request headers. And usually set in user cookies
    path("get_csrf", auth.get_csrf, name="get_csrf"), # Generate csrf token in user cookie
    path("is_authenticated", auth.is_authenticated, name="is_authenticated"), # Simply test if the user is_authenticated else return a 401
    path("logout", auth.user_logout, name="logout"),
    path("login", auth.user_login, name="login"),

    path("upload", photo.upload_photo, name="upload_photo"),
    path("resample", photo.resample_photo, name="resample_photo"),
    path("photos", photo.get_photos, name="get_photos"),

    path("unpublished", unpublished.get_unpublished, name="unpublished"),
    path("publish", unpublished.publish, name="publish"),

    path("tags", tags.get_tags, name="tags"),
    path("apply_tags", tags.apply_tags, name="apply_tags"),

    path("prv", troubleshooting.index, name="index"), # Test private page
    path("", troubleshooting.public_index, name="public_index"), # Test public page

    path("bootstrap", bootstrap.bootstrap, name="bootstrap"),
]