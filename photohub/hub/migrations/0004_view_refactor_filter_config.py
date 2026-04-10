import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0003_photo_favorite_photo_rating'),
    ]

    operations = [
        # --- View: drop old tags_filter M2M, add new fields ---
        migrations.RemoveField(
            model_name='view',
            name='tags_filter',
        ),
        migrations.AlterField(
            model_name='view',
            name='share_link',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='view',
            name='cover',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+', to='hub.photo',
            ),
        ),
        migrations.AddField(
            model_name='view',
            name='sort_by',
            field=models.CharField(default='date', max_length=50),
        ),
        migrations.AddField(
            model_name='view',
            name='sort_dir',
            field=models.CharField(default='desc', max_length=4),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_mode',
            field=models.CharField(default='basic', max_length=10),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_tags',
            field=models.ManyToManyField(blank=True, to='hub.tag'),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_favorite',
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_rating_value',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_rating_mode',
            field=models.CharField(default='gte', max_length=4),
        ),

        # --- ViewPhotoOrder: drop parasitic fields, fix OneToOne → FK, add unique_together ---
        migrations.RemoveField(model_name='viewphotoorder', name='name'),
        migrations.RemoveField(model_name='viewphotoorder', name='owner'),
        migrations.RemoveField(model_name='viewphotoorder', name='description'),
        migrations.RemoveField(model_name='viewphotoorder', name='value'),
        migrations.AlterField(
            model_name='viewphotoorder',
            name='photo',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='hub.photo',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='viewphotoorder',
            unique_together={('view', 'photo')},
        ),
    ]
