# CLAUDE.md — PhotoHub

Self-hosted photo management app. Django 5.2 backend + Vue 3 / Vuetify 3 frontend, containerised with Docker + Nginx.

---

## Language

All code comments, view/component names, UI labels, section headers, and placeholders must be written in **English**.

---

## Dev setup

```bash
# Start everything (hot-reload on frontend and backend)
docker compose -f docker-compose.yml -f docker-compose-dev.yml up

# App is accessible at http://localhost:8080
# Default credentials: admin / admin
```

> **Gotcha CSRF**: `DJANGO_URL` in docker-compose-dev.yml must match the URL from which you access the app (e.g. `http://192.168.3.33:8080`). A mismatch causes a silent JSON decode error on login.

**Ports inside containers:**
| Service     | Port  |
|-------------|-------|
| Nginx (public) | 8080 |
| Django      | 5000  |
| Vite dev    | 3000  |
| MySQL       | 3306  |

**Migrations:**
```bash
docker exec -it photohub-web-1 bash
python /photohub/manage.py migrate
python /photohub/manage.py makemigrations hub
```

**Build Vue manually (without Docker):**
```bash
docker run -it \
  -v $PWD/photohub-vuetify-src/:/photohub-vuetify-src \
  -v /tmp/photohub-vuetify/:/photohub-vuetify \
  node:lts-alpine3.21 \
  sh -c "cd /photohub-vuetify-src/ && yarn build --outDir /photohub-vuetify --emptyOutDir"
```

---

## Project structure

```
photohub/
├── photohub/                      # Django project
│   ├── photohub/                  # settings.py, urls.py, wsgi.py
│   └── hub/                       # Main app
│       ├── models.py              # DB models
│       ├── utils.py               # Image processing, helpers
│       ├── errors.py              # Error codes and ErrorResponse
│       ├── logger.py              # LOG instance
│       └── views/                 # API endpoints (one file per domain)
│           ├── auth.py            # login, logout, is_authenticated, get_csrf
│           ├── photo.py           # list/upload photos
│           ├── photo_actions.py   # get/update/delete/unpublish a photo
│           ├── tags.py            # list tags, apply tags to photos
│           ├── unpublished.py     # list unpublished, publish
│           └── admin.py           # bootstrap, dump, restore
│
├── photohub-vuetify-src/          # Vue 3 frontend
│   └── src/
│       ├── views/                 # Page components (Photos, Upload, Unpublished, Login, Views)
│       ├── components/            # Reusable components (DisplayPhoto, tagPhotos)
│       ├── layouts/default/       # AppBar, Alert, layout wrapper
│       ├── stores/                # Pinia stores (alert.js)
│       ├── router/index.js        # Route definitions
│       ├── plugins/vuetify.js     # Theme + Vuetify config
│       ├── styles/                # galleryGrid.css, settings.scss
│       ├── reactivefetch.js       # API client
│       ├── authrequired.js        # Auth guard
│       └── sharedDatas.js         # Mobile detection, grid sizes
│
├── docker/                        # Nginx templates, entrypoint scripts
├── docker-compose.yml
├── docker-compose-dev.yml
└── requirements.txt
```

---

## API conventions

**Base:** `/api/`

**Success response:**
```json
{ "status": 200, "data": { ... } }
```

**Error response:**
```json
{ "ERROR": "AuthRequired", "message": "...", "details": "...", "context": {} }
```

**Error codes:**
| Code | Meaning |
|------|---------|
| 401  | AuthRequired |
| 449  | LoginFail |
| 400  | ErrorRequest |
| 500  | Unexpected |

**CSRF:** GET `/api/get_csrf` sets cookie. All POST requests need header `X-CSRFToken`.

**Nginx routing:** `/api/*` → Django on port 5000. Everything else → Vue on port 3000 (dev) or static build.

---

## Django conventions

```python
from django.views.decorators.http import require_http_methods
from ..utils import login_required, json_decode, Response
from ..errors import ErrorResponse

@login_required
@require_http_methods(["POST"])
def my_view(request):
    post, err = json_decode(request.body)
    if err:
        return ErrorResponse("ErrorRequest", 400, "Invalid JSON", str(err))
    # ...
    return Response(data={"key": "value"})
```

- Use `from ..logger import LOG` then `LOG.debug()`, `LOG.error()`, etc.
- Use `model_to_dict()` then manually handle M2M and `auto_now_add` fields.
- Use `try/except models.X.DoesNotExist` → return 404 ErrorResponse.

---

## Frontend API call conventions

Use `reactivefetch.js` helpers:

```javascript
import { useAsyncGet, useAsyncPost } from '@/reactivefetch'

// GET
const { data, error } = await useAsyncGet('/api/photos?tags=foo')

// POST
const { data, error } = await useAsyncPost('/api/login', { username, password })
```

Auth guard in router navigation guards:
```javascript
import { requireAuth } from '@/authrequired'
// redirects to /login?next=<current_route> if not authenticated
```

Global alerts:
```javascript
import { useAlertStore } from '@/stores/alert'
const { triggerAlert } = useAlertStore()
triggerAlert({ message: 'Done!', type: 'success' })
```

---

## Photo storage

- Raw photos: `/data/static/raw/{hash[0]}/{hash[1]}/{md5}.jpg`
- Samples: `/data/static/cache/samples/{size}/{hash[0]}/{hash[1]}/{md5}.jpg`
- Sample sizes: `xs` (400px), `s` (800px), `m` (1200px), `l` (1600px), `xl` (2000px)
- Samples generated on first access if missing.
- Deduplication via MD5 hash (same content = same file).

---

## Models summary

| Model         | Key fields |
|---------------|-----------|
| `Photo`       | filename (unique, MD5), owner, published, type, width, height, date, upload_date, tags (M2M) |
| `Tag`         | name, color, description, tag_group (FK) |
| `TagGroup`    | name, color, description, type (checkbox/combobox) |
| `Exif`        | name, value, photo (FK) |
| `View`        | name, owner, description, public, share_link, tags (M2M) |
| `ViewPhotoOrder` | order management for View |

---

## Features status

| Feature                  | Status      |
|--------------------------|-------------|
| Photo gallery + filtering | Done        |
| Upload                   | Done        |
| Publish/unpublish workflow | Done       |
| Tagging system           | Done        |
| Photo detail             | Done        |
| Views / custom galleries | Skeleton only |
| Smart search             | TODO        |
| Moodboard / favorites    | TODO        |
| Video support            | TODO        |
| Non-JPEG (PNG, RAW)      | TODO        |
| Tests                    | TODO        |
