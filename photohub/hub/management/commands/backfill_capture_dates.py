"""One-shot backfill — re-reads the capture date from EXIF / ffprobe on every
already-uploaded Photo and rewrites Photo.date if the value differs.

Created to clean up the historical drift introduced by:
  - 596299c  photo: honour EXIF OffsetTimeOriginal so DateTimeOriginal → real UTC
  - 1704f1c  video: read capture date from container metadata at upload
  - a6cf43e  models: default Photo.date to timezone.now (aware UTC)

Photos uploaded before those landed had wrong dates baked in. This command is
safe to remove from the repo once all running instances have been migrated.

Usage:
    docker exec photohub-web-1 python /photohub/manage.py backfill_capture_dates --dry-run
    docker exec photohub-web-1 python /photohub/manage.py backfill_capture_dates
    docker exec photohub-web-1 python /photohub/manage.py backfill_capture_dates --type video
"""
import os
import subprocess

from django.conf import settings
from django.core.management.base import BaseCommand

from hub import models
from hub.logger import LOG
from hub.utils import (
    _get_absolute_path,
    _ffprobe_video,
    getRawPath,
    get_exif,
    parse_exif_capture_date,
    parse_video_creation_time,
)


class Command(BaseCommand):
    help = "Re-read EXIF / ffprobe capture date on existing Photo rows and update Photo.date."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Don't write — just print what would change.")
        parser.add_argument('--type', choices=['photo', 'video', 'both'], default='both',
                            help="Restrict the backfill to one media type.")
        parser.add_argument('--limit', type=int, default=None,
                            help="Process at most N rows (useful to test the command first).")

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        media_filter = opts['type']
        limit = opts['limit']

        qs = models.Photo.objects.all().order_by('id')
        if media_filter == 'photo':
            qs = qs.filter(type='photo')
        elif media_filter == 'video':
            qs = qs.filter(type='video')
        if limit:
            qs = qs[:limit]

        total = qs.count() if not limit else len(list(qs))
        self.stdout.write(self.style.NOTICE(
            "backfill_capture_dates: scanning %d row(s) (type=%s, dry_run=%s)"
            % (total, media_filter, dry)
        ))

        changed = unchanged = missing_file = no_date = errors = 0

        for photo in qs:
            raw_abs = _get_absolute_path(getRawPath(photo.filename))
            if not os.path.exists(raw_abs):
                missing_file += 1
                self.stdout.write(self.style.WARNING(
                    "  %s — raw file missing on disk (%s)" % (photo.filename, raw_abs)
                ))
                continue

            try:
                new_date = self._extract_date(photo, raw_abs)
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(
                    "  %s — error: %s" % (photo.filename, e)
                ))
                continue

            if new_date is None:
                no_date += 1
                continue

            current = photo.date
            # Photo.date is timezone-aware (USE_TZ=True). Compare seconds-precision
            # to ignore the sub-second drift Django adds when reading back.
            same = current and int(current.timestamp()) == int(new_date.timestamp())
            if same:
                unchanged += 1
                continue

            changed += 1
            self.stdout.write("  %s — %s → %s" % (
                photo.filename,
                current.isoformat() if current else 'None',
                new_date.isoformat(),
            ))
            if not dry:
                photo.date = new_date
                photo.save(update_fields=['date'])

        summary = "%s: changed=%d, unchanged=%d, no_date_in_metadata=%d, missing_file=%d, errors=%d" % (
            "DRY RUN — would change" if dry else "DONE — changed",
            changed, unchanged, no_date, missing_file, errors,
        )
        self.stdout.write(self.style.SUCCESS(summary))

    def _extract_date(self, photo, raw_abs):
        """Return the aware-UTC capture date for `photo`, or None when the
        metadata doesn't carry one (the upload-time default stays in place)."""
        if photo.type == 'video':
            try:
                _w, _h, _d, creation_time = _ffprobe_video(raw_abs)
            except Exception as e:
                LOG.warning("backfill: ffprobe failed on %s: %s" % (photo.filename, e))
                return None
            return parse_video_creation_time(creation_time)
        # Photo
        with open(raw_abs, 'rb') as f:
            exifs = get_exif(f)
        return parse_exif_capture_date(exifs)
