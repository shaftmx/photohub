from django.db import models
from datetime import datetime
# from datetime import date

# Create your models here.

class TagGroup(models.Model):
    name = models.CharField(max_length=250, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=64, null=True, blank=True)
    # color = blue || #a8325e
    type = models.CharField(max_length=150, default="checkbox", choices=[('checkbox', 'Checkbox'), ('combobox', 'Combobox')])
    # combobox: dynamic dropdown multiselect but also work as aucomplete and allow to add new tags dynamically
    # TODO disable the right of adding dynamic tags ?
    # checkbox: static clickable box/chips
    def __str__(self):
        return '%s' % (self.name)

class Tag(models.Model):
    name = models.CharField(max_length=250, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=64, blank=True, null=True)
    tag_group = models.ForeignKey(TagGroup, on_delete=models.CASCADE)
    # def __str__(self):
    #     return '%s - %s' % (self.tag_group.name, self.name)
    
class Photo(models.Model):
    owner = models.CharField(max_length=250)
    type = models.CharField(max_length=150, default="photo")  # 'photo' | 'video'
    transcode_status = models.CharField(max_length=20, default='done')  # 'pending' | 'processing' | 'done' | 'error'
    duration = models.FloatField(null=True, blank=True)  # seconds, videos only
    description = models.TextField(blank=True)
    width = models.IntegerField()
    height = models.IntegerField()
    published = models.BooleanField(default=False)
    favorite = models.BooleanField(default=False)
    rating = models.IntegerField(default=0)  # 0 = not rated, 1-5 stars
    filename = models.CharField(max_length=250, unique=True)
    origin_filename = models.TextField(blank=True)
    date = models.DateTimeField(default=datetime.now)
    upload_date = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag)

class Exif(models.Model):
    name = models.CharField(max_length=250)
    value = models.TextField(max_length=250)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)


# class Moodboard(models.Model):
#     description = models.TextField(blank=True)
#     public = models.BooleanField(default=False)
#     share_link = models.CharField(max_length=512)
#     photo = models.ForeignKey(Photo, on_delete=models.CASCADE)

# class MoodboardPhotoOrder(models.Model):
#     name = models.CharField(max_length=250)
#     value = models.TextField(max_length=250)
#     order = models.IntegerField()
#     moodboard = models.ForeignKey(Moodboard, on_delete=models.CASCADE)
#     photo = models.OneToOneField(Photo, on_delete=models.CASCADE)


class View(models.Model):
    name = models.CharField(max_length=250)
    owner = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    public = models.BooleanField(default=False)
    share_link = models.CharField(max_length=512, blank=True)
    share_link_expires_at = models.DateTimeField(null=True, blank=True)
    upload_link = models.CharField(max_length=512, blank=True)
    cover = models.ForeignKey(Photo, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    sort_by = models.CharField(max_length=50, default='date')    # date / upload_date / rating / filename
    sort_dir = models.CharField(max_length=4, default='desc')    # asc / desc
    # Filter state
    filter_mode = models.CharField(max_length=10, default='basic')  # basic / smart / notags
    filter_tags = models.ManyToManyField(Tag, blank=True)
    filter_favorite = models.BooleanField(null=True, blank=True)    # null=all, True=fav only
    filter_rating_value = models.IntegerField(default=0)
    filter_rating_mode = models.CharField(max_length=4, default='gte')  # lte / gte / eq
    filter_media_type = models.CharField(max_length=10, default='all')  # all / photo / video


class AppConfig(models.Model):
    """Runtime configuration — overrides settings.py defaults, stored in DB."""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()

    def __str__(self):
        return '%s=%s' % (self.key, self.value)


class ViewPhotoOrder(models.Model):
    order = models.IntegerField()
    view = models.ForeignKey(View, on_delete=models.CASCADE)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)

    class Meta:
        unique_together = [('view', 'photo')]
        ordering = ['order']
