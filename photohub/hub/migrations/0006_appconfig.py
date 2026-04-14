from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0005_create_groups'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100, unique=True)),
                ('value', models.TextField()),
            ],
        ),
    ]
