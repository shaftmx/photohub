from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("hub/", include("hub.urls")),
    path("admin/", admin.site.urls),
]
