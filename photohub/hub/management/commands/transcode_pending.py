import time
import subprocess
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from hub.models import Photo, AppConfig
from hub.utils import getRawPath, get_setting, _get_absolute_path, get_video_original_path
from hub.logger import LOG


def _heartbeat(photo=None):
    """Update worker heartbeat timestamps in AppConfig."""
    now = timezone.now().isoformat()
    AppConfig.objects.update_or_create(key='WORKER_LAST_SEEN', defaults={'value': now})
    if photo:
        AppConfig.objects.update_or_create(key='WORKER_ENCODING_SINCE', defaults={'value': now})
        AppConfig.objects.update_or_create(key='WORKER_ENCODING_FILE', defaults={'value': photo.origin_filename or photo.filename})
        AppConfig.objects.update_or_create(key='WORKER_ENCODING_INTERNAL', defaults={'value': photo.filename})
    else:
        AppConfig.objects.filter(key__in=['WORKER_ENCODING_SINCE', 'WORKER_ENCODING_FILE', 'WORKER_ENCODING_INTERNAL']).delete()


def _transcode_video(photo):
    filename = photo.filename
    raw_path = getRawPath(filename)
    abs_path = _get_absolute_path(raw_path)
    tmp_path = abs_path + '.transcoding.mp4'

    threads = get_setting('TRANSCODE_THREADS')
    preset  = get_setting('TRANSCODE_PRESET')
    crf     = get_setting('TRANSCODE_CRF')

    LOG.info("[transcode] original_ext=%r  input=%s" % (photo.original_ext, abs_path))

    timeout = get_setting('TRANSCODE_TIMEOUT') or 3600

    result = subprocess.run(
        ['ffmpeg', '-y', '-i', abs_path,
         '-c:v', 'libx264', '-preset', preset, '-crf', str(crf),
         '-threads', str(threads),
         '-movflags', '+faststart',
         '-c:a', 'aac', '-b:a', '128k',
         tmp_path],
        capture_output=True, timeout=timeout,
    )
    if result.returncode != 0:
        raise Exception("ffmpeg transcode failed: %s" % result.stderr.decode())

    LOG.info("[transcode] ffmpeg done, tmp=%s" % tmp_path)

    # If original must be kept: rename raw/<md5>.mp4 → raw/<md5>_original.<ext>, then temp → raw/<md5>.mp4
    if photo.original_ext:
        orig_abs_path = _get_absolute_path(get_video_original_path(filename, photo.original_ext))
        os.makedirs(os.path.dirname(orig_abs_path), exist_ok=True)
        LOG.info("[transcode] preserving original: %s → %s" % (abs_path, orig_abs_path))
        os.rename(abs_path, orig_abs_path)
    else:
        LOG.info("[transcode] no original_ext — original file will be overwritten by transcoded version")

    os.replace(tmp_path, abs_path)
    LOG.info("[transcode] transcoded file in place: %s" % abs_path)


def process_pending():
    pending = Photo.objects.filter(type='video', transcode_status='pending')
    for photo in pending:
        LOG.info("[transcode] Processing %s (original_ext=%r)" % (photo.filename, photo.original_ext))
        photo.transcode_status = 'processing'
        photo.save(update_fields=['transcode_status'])
        _heartbeat(photo=photo)
        try:
            _transcode_video(photo)
            photo.transcode_status = 'done'
            photo.save(update_fields=['transcode_status'])
            LOG.info("[transcode] Done: %s" % photo.filename)
        except Exception as e:
            photo.transcode_status = 'error'
            photo.save(update_fields=['transcode_status'])
            LOG.error("[transcode] Error %s: %s" % (photo.filename, e))
    _heartbeat()  # clear encoding state after all pending processed


class Command(BaseCommand):
    help = 'Transcode pending videos (runs forever, polling DB)'

    def handle(self, *args, **options):
        LOG.info("[transcode] Worker started")
        while True:
            _heartbeat()
            try:
                process_pending()
            except Exception as e:
                LOG.error("[transcode] Unexpected error: %s" % e)
            interval = get_setting('TRANSCODE_POLL_INTERVAL')
            time.sleep(interval)
