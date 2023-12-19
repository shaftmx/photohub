from django.db import models
from datetime import datetime
# from datetime import date

# Create your models here.

class TagGroup(models.Model):
    name = models.CharField(max_length=250, unique=True)
    color = models.CharField(max_length=64, null=True)


class Tag(models.Model):
    name = models.CharField(max_length=250, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=64, null=True)
    tag_group = models.ForeignKey(TagGroup, on_delete=models.CASCADE)

class Photo(models.Model):
    owner = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    width = models.IntegerField()
    height = models.IntegerField()
    published = models.BooleanField(default=False)
    filename = models.CharField(max_length=250, unique=True)
    date = models.DateTimeField(default=datetime.now) # By default same as upload. Buf if we got a date in exif, we put the more specific one
    upload_date = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag)

class Exif(models.Model):
    name = models.CharField(max_length=250)
    value = models.TextField(max_length=250)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)


class Moodboard(models.Model):
    description = models.TextField(blank=True)
    public = models.BooleanField(default=False)
    share_link = models.CharField(max_length=512)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)

class MoodboardPhotoOrder(models.Model):
    name = models.CharField(max_length=250)
    value = models.TextField(max_length=250)
    order = models.IntegerField()
    moodboard = models.ForeignKey(Moodboard, on_delete=models.CASCADE)
    photo = models.OneToOneField(Photo, on_delete=models.CASCADE)


class View(models.Model):
    name = models.CharField(max_length=250)
    owner = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    public = models.BooleanField(default=False)
    share_link = models.CharField(max_length=512)
    tags_filter = models.TextField()


class ViewPhotoOrder(models.Model):
    name = models.CharField(max_length=250)
    owner = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    value = models.TextField(max_length=250)
    order = models.IntegerField()
    view = models.ForeignKey(View, on_delete=models.CASCADE)
    photo = models.OneToOneField(Photo, on_delete=models.CASCADE)
