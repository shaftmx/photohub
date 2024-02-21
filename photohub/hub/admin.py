from django.contrib import admin

# Register your models here.

from .models import *


class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "tag_group", "color"]

class TagGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "color"]


admin.site.register(Tag, TagAdmin)
admin.site.register(TagGroup, TagGroupAdmin)

admin.site.register(Photo)

# class ShopListModelAdmin(admin.ModelAdmin):
#     formfield_overrides = {
#         models.ManyToManyField: {
#             'widget': SelectMultiple(attrs={'size':'30'},)
#         },
#     }

# admin.site.register(ShopList, ShopListModelAdmin)
# admin.site.register(Item)


# class Set_User_Form(ModelForm):
#   emails_for_help = forms.ModelMultipleChoiceField(
#     queryset=User.objects.all(),
#     widget=forms.CheckboxSelectMultiple
#   )

#   class Meta:
#     model = Setupuser
#     fields = ["organization","emails_for_help"]