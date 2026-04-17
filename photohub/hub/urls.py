from django.urls import path

from .views import auth
from .views import photo
from .views import photo_actions
from .views import tags
from .views import unpublished
from .views import admin
from .views import admin_users
from .views import admin_tags
from .views import admin_config
from .views import admin_export
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
    path("views/<int:view_id>/share-link/expiry", views_api.set_share_link_expiry, name="set_share_link_expiry"),
    path("views/<int:view_id>/share-link/revoke", views_api.revoke_share_link, name="revoke_share_link"),
    path("views/<int:view_id>/photos", views_api.get_view_photos, name="get_view_photos"),
    path("views/<int:view_id>/download", views_api.download_view_zip, name="download_view_zip"),

    # Admin — users (admin only)
    path("admin/users", admin_users.list_users, name="admin_list_users"),
    path("admin/users/create", admin_users.create_user, name="admin_create_user"),
    path("admin/users/<int:user_id>/delete", admin_users.delete_user, name="admin_delete_user"),
    path("admin/users/<int:user_id>/set-password", admin_users.set_password, name="admin_set_password"),
    path("admin/users/<int:user_id>/set-role", admin_users.set_role, name="admin_set_role"),

    # Admin — tags (admin + contributor)
    path("admin/tags", admin_tags.tags_view, name="admin_tags"),

    # Admin — config / photo quality (admin only)
    path("admin/config", admin_config.config_view, name="admin_config"),
    path("admin/flush-samples", admin_config.flush_samples, name="admin_flush_samples"),

    # Admin — export / import (admin only)
    path("admin/export", admin_export.export_dump, name="admin_export"),
    path("admin/export/status", admin_export.export_status, name="admin_export_status"),
    path("admin/import", admin_export.import_dump, name="admin_import"),
    path("admin/import/status", admin_export.import_status, name="admin_import_status"),
]
