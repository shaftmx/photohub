from django.db import migrations


def create_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.get_or_create(name='contributor')
    Group.objects.get_or_create(name='member')


def delete_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=['contributor', 'member']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0004_view_refactor_filter_config'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(create_groups, delete_groups),
    ]
