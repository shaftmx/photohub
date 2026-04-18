import time
import subprocess
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from hub.models import Photo, AppConfig
from hub.utils import getRawPath, generate_video_poster, get_setting, _get_absolute_path
from hub.logger import LOG


def _heartbeat(encoding_filename=None):
    """Update worker heartbeat timestamps in AppConfig."""
    now = timezone.now().isoformat()
    AppConfig.objects.update_or_create(key='WORKER_LAST_SEEN', defaults={'value': now})
    if encoding_filename:
        AppConfig.objects.update_or_create(key='WORKER_ENCODING_SINCE', defaults={'value': now})
        AppConfig.objects.update_or_create(key='WORKER_ENCODING_FILE', defaults={'value': encoding_filename})
    else:
        AppConfig.objects.filter(key__in=['WORKER_ENCODING_SINCE', 'WORKER_ENCODING_FILE']).delete()


def _transcode_video(filename):
    raw_path = getRawPath(filename)
    abs_path = _get_absolute_path(raw_path)
    tmp_path = abs_path + '.transcoding.mp4'

    result = subprocess.run(
        ['ffmpeg', '-y', '-i', abs_path,
         '-c:v', 'libx264', '-preset', 'fast', '-movflags', '+faststart',
         '-c:a', 'aac', '-b:a', '128k',
         tmp_path],
        capture_output=True, timeout=3600,
    )
    if result.returncode != 0:
        raise Exception("ffmpeg transcode failed: %s" % result.stderr.decode())

    os.replace(tmp_path, abs_path)


def process_pending():
    pending = Photo.objects.filter(type='video', transcode_status='pending')
    for photo in pending:
        LOG.info("[transcode] Processing %s" % photo.filename)
        print("[transcode] Processing %s" % photo.filename)
        photo.transcode_status = 'processing'
        photo.save(update_fields=['transcode_status'])
        _heartbeat(encoding_filename=photo.filename)
        try:
            _transcode_video(photo.filename)
            err = generate_video_poster(photo.filename)
            if err:
                raise err
            photo.transcode_status = 'done'
            photo.save(update_fields=['transcode_status'])
            print("[transcode] Done: %s" % photo.filename)
        except Exception as e:
            photo.transcode_status = 'error'
            photo.save(update_fields=['transcode_status'])
            print("[transcode] Error %s: %s" % (photo.filename, e))
            LOG.error("[transcode] Error %s: %s" % (photo.filename, e))
    _heartbeat()  # clear encoding state after all pending processed


class Command(BaseCommand):
    help = 'Transcode pending videos (runs forever, polling DB)'

    def handle(self, *args, **options):
        print("[transcode] Worker started")
        while True:
            _heartbeat()
            try:
                process_pending()
            except Exception as e:
                print("[transcode] Unexpected error: %s" % e)
            interval = get_setting('TRANSCODE_POLL_INTERVAL') or 10
            time.sleep(interval)
