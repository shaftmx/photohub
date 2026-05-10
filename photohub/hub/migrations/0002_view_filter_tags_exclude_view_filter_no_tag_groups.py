from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='view',
            name='filter_tags_exclude',
            field=models.ManyToManyField(blank=True, related_name='excluded_in_views', to='hub.tag'),
        ),
        migrations.AddField(
            model_name='view',
            name='filter_no_tag_groups',
            field=models.ManyToManyField(blank=True, related_name='no_tag_required_in_views', to='hub.taggroup'),
        ),
    ]
