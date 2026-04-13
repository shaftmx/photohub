from django.urls import path

from .views import troubleshooting
from .views import auth
from .views import photo
from .views import photo_actions
from .views import tags
from .views import unpublished
from .views import admin
from .views import view as views_api


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

    # Public / shared view access (no auth required)
    path("public/views", views_api.list_public_views, name="list_public_views"),
    path("public/views/<int:view_id>/photos", views_api.get_public_view_photos, name="get_public_view_photos"),
    path("shared_view/<str:token>/photos", views_api.get_shared_view_photos, name="get_shared_view_photos"),

    # Views
    path("views", views_api.list_views, name="list_views"),
    path("views/create", views_api.create_view, name="create_view"),
    path("views/<int:view_id>", views_api.get_view, name="get_view"),
    path("views/<int:view_id>/update", views_api.update_view, name="update_view"),
    path("views/<int:view_id>/delete", views_api.delete_view, name="delete_view"),
    path("views/<int:view_id>/share-link", views_api.generate_share_link, name="generate_share_link"),
    path("views/<int:view_id>/share-link/revoke", views_api.revoke_share_link, name="revoke_share_link"),
    path("views/<int:view_id>/photos", views_api.get_view_photos, name="get_view_photos"),

    # Admin
    path("bootstrap", admin.bootstrap, name="bootstrap"),
    path("dump", admin.dump, name="dump"),
    path("restore", admin.restore, name="restore"),
]
