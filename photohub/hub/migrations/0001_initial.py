# Generated by Django 4.2.7 on 2023-12-10 16:56

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Moodboard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.TextField(blank=True)),
                ('public', models.BooleanField(default=False)),
                ('share_link', models.CharField(max_length=512)),
            ],
        ),
        migrations.CreateModel(
            name='Photo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('owner', models.CharField(max_length=250)),
                ('description', models.TextField(blank=True)),
                ('published', models.BooleanField(default=False)),
                ('filename', models.CharField(max_length=250, unique=True)),
                ('date', models.DateField(auto_now_add=True)),
                ('upload_date', models.DateField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='TagGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250, unique=True)),
                ('color', models.CharField(max_length=64, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='View',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('owner', models.CharField(max_length=250)),
                ('description', models.TextField(blank=True)),
                ('public', models.BooleanField(default=False)),
                ('share_link', models.CharField(max_length=512)),
                ('tags_filter', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='ViewPhotoOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('owner', models.CharField(max_length=250)),
                ('description', models.TextField(blank=True)),
                ('value', models.TextField(max_length=250)),
                ('order', models.IntegerField()),
                ('photo', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='hub.photo')),
                ('view', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hub.view')),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250, unique=True)),
                ('description', models.TextField(blank=True)),
                ('color', models.CharField(max_length=64, null=True)),
                ('tag_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hub.taggroup')),
            ],
        ),
        migrations.AddField(
            model_name='photo',
            name='tags',
            field=models.ManyToManyField(to='hub.tag'),
        ),
        migrations.CreateModel(
            name='MoodboardPhotoOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('value', models.TextField(max_length=250)),
                ('order', models.IntegerField()),
                ('moodboard', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hub.moodboard')),
                ('photo', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='hub.photo')),
            ],
        ),
        migrations.AddField(
            model_name='moodboard',
            name='photo',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hub.photo'),
        ),
        migrations.CreateModel(
            name='Exif',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('value', models.TextField(max_length=250)),
                ('photo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hub.photo')),
            ],
        ),
    ]
