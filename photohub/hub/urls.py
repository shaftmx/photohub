from django.urls import path

from .views import troubleshooting
from .views import auth
from .views import photo
from .views import photo_actions
from .views import tags
from .views import unpublished
from .views import admin


urlpatterns = [
    # Auth
    path("get_csrf", auth.get_csrf, name="get_csrf"),
    path("is_authenticated", auth.is_authenticated, name="is_authenticated"),
    path("logout", auth.user_logout, name="logout"),
    path("login", auth.user_login, name="login"),

    # Photos
    path("upload", photo.upload_photo, name="upload_photo"),
    path("resample", photo.resample_photo, name="resample_photo"),
    path("photos", photo.get_photos, name="get_photos"),

    # Photo actions (detail, delete, unpublish, update)
    path("photos/<str:filename>", photo_actions.get_photo, name="get_photo"),
    path("photos/<str:filename>/unpublish", photo_actions.unpublish_photo, name="unpublish_photo"),
    path("photos/<str:filename>/delete", photo_actions.delete_photo, name="delete_photo"),
    path("photos/<str:filename>/update", photo_actions.update_photo, name="update_photo"),

    # Unpublished
    path("unpublished", unpublished.get_unpublished, name="unpublished"),
    path("publish", unpublished.publish, name="publish"),

    # Tags
    path("tags", tags.get_tags, name="tags"),
    path("apply_tags", tags.apply_tags, name="apply_tags"),

    # Troubleshooting
    path("prv", troubleshooting.index, name="index"),
    path("", troubleshooting.public_index, name="public_index"),

    # Admin
    path("bootstrap", admin.bootstrap, name="bootstrap"),
    path("dump", admin.dump, name="dump"),
    path("restore", admin.restore, name="restore"),
]
