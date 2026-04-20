"""
Django settings for photohub.
"""

from pathlib import Path
import os


def strtobool(val):
    val = val.lower()
    if val in ('y', 'yes', 't', 'true', 'on', '1'):
        return True
    elif val in ('n', 'no', 'f', 'false', 'off', '0'):
        return False
    else:
        raise Exception("invalid truth value %r" % (val,))


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ─── Security ────────────────────────────────────────────────────────────────

# Env: DJANGO_SECRET_KEY — required in production. Default is insecure dev key.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-51=qtuhifsb)&!!gdps^rkn2^re7_#nqp62pcq7fi^d*015+)6')

# Env: DEBUG — default False. WARNING: disables CSRF middleware when True.
DEBUG = strtobool(os.environ.get('DEBUG', "False"))

# Allow all hosts — the app is expected to run behind a reverse proxy.
ALLOWED_HOSTS = ["*"]

# Env: DJANGO_URL — comma-separated list of trusted origins for CSRF
# (e.g. "https://photos.example.com"). Required in production.
_django_url = os.environ.get('DJANGO_URL', '')
CSRF_TRUSTED_ORIGINS = [u for u in _django_url.split(",") if u]


# ─── Application ─────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'hub',
    # 'django.contrib.admin',  # disabled — legacy, PhotoHub has its own admin UI
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CSRF is disabled in debug mode (simplifies local dev with the Vue dev server).
if DEBUG:
    MIDDLEWARE.remove('django.middleware.csrf.CsrfViewMiddleware')

ROOT_URLCONF = 'photohub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'photohub.wsgi.application'

DEBUG_PROPAGATE_EXCEPTIONS = True


# ─── Database ─────────────────────────────────────────────────────────────────
# All four DB_* env vars are required — no defaults.
# SQLite alternative for quick local testing (no MySQL needed):
#   'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME'),       # Env: DB_NAME
        'USER': os.environ.get('DB_USER'),       # Env: DB_USER
        'PASSWORD': os.environ.get('DB_PASSWORD'), # Env: DB_PASSWORD
        'HOST': os.environ.get('DB_HOST'),       # Env: DB_HOST
        # 'PORT': os.environ.get('DB_PORT', "3306"),  # Env: DB_PORT — default 3306
    }
}


# ─── Password validation ──────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─── Internationalisation ─────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ─── Static files ─────────────────────────────────────────────────────────────

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ─── Logging ──────────────────────────────────────────────────────────────────

# Env: LOG_LEVEL — root logger level. Default: WARNING. Use INFO or DEBUG for more verbosity.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s]: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('LOG_LEVEL', 'WARNING'),
    },
}


# ─── Photo storage ────────────────────────────────────────────────────────────

# Env: MEDIA_ROOT — root directory for all photo files (raw + samples).
# Used by django.core.files.storage.default_storage. Default: /data/static
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', '/data/static')

# Env: DUMP_ROOT — directory for YAML metadata dumps (admin export, not used by the app).
# Default: /dumps/latest
DUMP_ROOT = os.environ.get('DUMP_ROOT', '/dumps/latest')

# Sub-paths relative to MEDIA_ROOT (not overridable via env — change in code if needed).
RAW_PHOTOS_PATH = 'raw'
SAMPLE_PHOTOS_PATH = 'cache/samples'


# ─── Photo processing ─────────────────────────────────────────────────────────
#
# NOTE: RAW_PHOTOS_QUALITY, RAW_PHOTOS_MAX_SIZE, RAW_PHOTO_OVERRIDE_EXISTS,
# GENERATE_SAMPLES_ON_UPLOAD and SAMPLE_PHOTOS_SETTINGS can all be overridden
# at runtime via the Admin panel (Photo quality tab). Once changed there, the
# value stored in AppConfig (DB) takes precedence and the env var / value below
# is no longer read. Values below are the initial defaults only.

# Env: RAW_PHOTOS_QUALITY — Pillow JPEG quality preset applied when saving raw photos.
# Any of: web_low, web_medium, web_high, web_maximum, web_very_high
# Default: None — original file is stored as-is, no re-encoding.
#
# Re-encoding behaviour (when either QUALITY or MAX_SIZE is set):
#   - QUALITY only   → re-encode at the given quality, original dimensions kept.
#   - MAX_SIZE only  → resize only, quality="keep" (Pillow preserves original quality best-effort).
#   - Both set       → resize then re-encode at the given quality.
#   - Both None      → file copied as-is, zero quality loss.
# ICC profile and EXIF metadata are always preserved on re-encode.
RAW_PHOTOS_QUALITY = os.environ.get('RAW_PHOTOS_QUALITY') or None

# Env: RAW_PHOTOS_MAX_SIZE — maximum dimension in pixels (width and height).
# Aspect ratio is preserved via Pillow thumbnail(). Default: None (no resize).
_max_size = os.environ.get('RAW_PHOTOS_MAX_SIZE')
RAW_PHOTOS_MAX_SIZE = int(_max_size) if _max_size else None

# Env: RAW_PHOTO_OVERRIDE_EXISTS — behaviour when a file with the same MD5 is uploaded again.
#   True  (default) — delete and rewrite the file on disk (applies current QUALITY/MAX_SIZE),
#                     and refresh the DB record (EXIF, dimensions, owner).
#                     Useful after changing compression settings to re-process existing files.
#   False           — skip entirely: returns HTTP 202 "Picture already exist".
#                     Neither the file on disk nor the DB record is updated.
RAW_PHOTO_OVERRIDE_EXISTS = strtobool(os.environ.get('RAW_PHOTO_OVERRIDE_EXISTS', 'False'))

# Env: GENERATE_SAMPLES_ON_UPLOAD — whether to generate sample files immediately at upload time.
#   True  (default) — samples generated synchronously during upload.
#   False           — samples generated lazily on first access. Speeds up bulk imports.
GENERATE_SAMPLES_ON_UPLOAD = strtobool(os.environ.get('GENERATE_SAMPLES_ON_UPLOAD', 'False'))

ALLOW_VIDEO_UPLOAD      = strtobool(os.environ.get('ALLOW_VIDEO_UPLOAD', 'False'))
KEEP_ORIGINAL_VIDEO     = strtobool(os.environ.get('KEEP_ORIGINAL_VIDEO', 'False'))
TRANSCODE_POLL_INTERVAL = int(os.environ.get('TRANSCODE_POLL_INTERVAL', '10'))
TRANSCODE_THREADS       = int(os.environ.get('TRANSCODE_THREADS', '0'))
TRANSCODE_PRESET        = os.environ.get('TRANSCODE_PRESET', 'fast')
TRANSCODE_CRF           = int(os.environ.get('TRANSCODE_CRF', '23'))
TRANSCODE_TIMEOUT       = int(os.environ.get('TRANSCODE_TIMEOUT', '3600'))

GALLERY_PAGE_SIZE_DESKTOP = int(os.environ.get('GALLERY_PAGE_SIZE_DESKTOP', '600'))
GALLERY_PAGE_SIZE_MOBILE  = int(os.environ.get('GALLERY_PAGE_SIZE_MOBILE', '500'))

# Sample (resized) versions generated for each uploaded photo.
# The frontend picks the appropriate sample automatically based on the grid
# slider value (PhotoGrid.vue computed adaptivePhotoSize), using the max_size
# values exposed via paths._sizes in the API response.
# Current usage at default grid sizes (see sharedDatas.js):
#   xs (400px)  — grid thumbnails on mobile / view cover cards
#   s  (800px)  — grid thumbnails on desktop
#   m  (1200px) — fullscreen display on mobile
#   l  (2000px) — fullscreen display on desktop
#   xl (4000px) — commented out; if needed for downloads, generate on-the-fly from raw
SAMPLE_PHOTOS_SETTINGS = [
    {"name": "xs", "max_size": 400,  "quality": "web_medium"},
    {"name": "s",  "max_size": 800,  "quality": "web_medium"},
    {"name": "m",  "max_size": 1200, "quality": "web_high"},
    {"name": "l",  "max_size": 2500, "quality": "web_high"},
    # xl disabled — not used by any view. If needed for future ZIP download,
    # generate on-the-fly from raw rather than storing permanently.
    # {"name": "xl", "max_size": 4000, "quality": "web_very_high"},
]


# ─── Bootstrap directories ────────────────────────────────────────────────────

for _dir in [os.path.join(MEDIA_ROOT, RAW_PHOTOS_PATH), os.path.join(MEDIA_ROOT, SAMPLE_PHOTOS_PATH)]:
    if not os.path.exists(_dir):
        os.makedirs(_dir)
