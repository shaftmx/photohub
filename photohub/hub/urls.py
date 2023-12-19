from django.urls import path

from . import views

urlpatterns = [
    # get_csrf token is used for security middleware. It as to be present in POST request headers. And usually set in user cookies
    path("get_csrf", views.get_csrf, name="get_csrf"), # Generate csrf token in user cookie
    path("is_authenticated", views.is_authenticated, name="is_authenticated"), # Simply test if the user is_authenticated else return a 401
    path("logout", views.user_logout, name="logout"),
    path("login", views.user_login, name="login"),
    path("upload", views.upload_photo, name="upload_photo"),
    path("resample", views.resample_photo, name="resample_photo"),
    path("unpublished", views.get_unpublished, name="unpublished"),
    path("prv", views.index, name="index"), # Test private page
    path("", views.public_index, name="public_index"), # Test public page
]
