from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0009_video_support'),
    ]

    operations = [
        migrations.AddField(
            model_name='photo',
            name='original_ext',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
