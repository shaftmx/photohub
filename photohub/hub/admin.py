from django.contrib import admin

# Register your models here.

from .models import *


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