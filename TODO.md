# PhotoHub — TODO

> Legend: ✅ done · 🚧 partial · ⬜ todo

---

## Bug fixes

- ⬜ EXIF date parsing: if no format matches, currently crashes upload — convert to LOG.warning + date=None so unknown formats don't block upload

## Features

- 🚧 **Pagination** — phase 1 done (hard cap + banner); phase 2 pending:
  - Full pagination UI — prev/next + page numbers at top and bottom; page resets on filter/tag/sort change; backend accepts `?page=&limit=`; response includes `total`, `page`, `pages`
- ⬜ **Filter by owner** — photos and views have an `owner` field; future UI to filter/isolate content by owner
- ⬜ **Multi-view group link** — a shareable link bundling multiple private views into a single public page; create/edit/delete the group, select views, regenerate/revoke; shown at bottom of Views page
  - Optional expiry date

## Sécurité

- ⬜ **Protection des fichiers media via nginx `auth_request`** — actuellement les images (`/samples/`, `/raw/`) sont servies directement par nginx sans contrôle d'accès. N'importe qui connaissant l'URL peut accéder à une photo non publiée ou appartenant à une vue privée.
  - Approche retenue : nginx `auth_request` avec cache. Pour chaque requête image, nginx fait une sous-requête légère vers un endpoint Django (ex. `/api/media-auth?path=...`) qui vérifie si la ressource est accessible (authentifié, photo publiée, vue publique, share link valide…). Nginx sert le fichier lui-même (pas de passage par Django), donc les perfs restent bonnes.
  - Le cache `auth_request` peut être de plusieurs minutes — acceptable, le seul cas limite est un accès révoqué qui resterait valide jusqu'à expiration du cache.
  - Référence : https://www.djangosnippets.org/snippets/491/ et https://stackoverflow.com/questions/28704712/django-nginx-x-accel-redirect-for-protected-files-on-webfaction

## Code quality / Audit

- ⬜ **Code review — duplication & simplification**: scan frontend and backend for duplicated logic (e.g. serialization, URL construction, filter handling) and opportunities to simplify or extract shared helpers
- ⬜ **Dead code & security audit**: identify unused code (views, endpoints, components, CSS); verify all API endpoints require appropriate authentication; check for obvious security issues
- ⬜ **Test coverage review**: cross-check COVERAGE.md against actual features; identify gaps especially around video, upload link, map, and admin flows; add missing E2E tests

## Infra / Dev

---

## Archive

### Photos (main gallery view)

- ✅ Filter by tags (TagFilter component)
- ✅ Tag filter: AND by default, optional OR mode (filter_mode=basic/smart)
- ✅ Display all pictures
- ✅ Show photos without tags (filter option — "No tags" mode in filter toggle)
- ✅ One-click: create a view from current active tag filters ("Save as view" button)
- ✅ Selection mode: select multiple photos → bulk action: delete, unpublish, tag editing

### Photo properties

- ✅ Description (editable from detail panel)
- ✅ Tags (editable from detail panel)
- ✅ **Favorite** — heart button, toggle in detail panel and grid hover, filter in photos view
- ✅ **Rating** — 0 to 5 stars, editable in detail panel, filter with ≤/=/≥ operator in photos view

### Photo display (detail panel)

- ✅ Description field (editable)
- ✅ Edit tags
- ✅ EXIF display
- ✅ GPS: if EXIF contains GPS data, show an "Open in Google Maps" link next to the coordinates
- ✅ GPS shortcut in photo detail header — map-pin icon button at the top of the detail panel
- ✅ Favorite (heart) button
- ✅ Rating (stars) widget
- ✅ Define as cover — button in photo detail panel (embedded mode), visible only from a view context

### Views

- ✅ **Back button in view detail** — when logged in, show a back button returning to views list
- ✅ View has a name and a description/notes (text, markdown)
- ✅ Dynamic: view = tag filters → auto-includes new matching photos
- ✅ Filter config: tags, favorite, rating, filter mode (quick/detailed/notags)
- ✅ Visibility: public or private flag
- ✅ Sort / display order — configurable default, switchable in detail view
- ✅ Cover photo: auto-fallback to first matching photo
- ✅ Create / Edit / Delete / List / Detail UI
- ✅ Cover photo: selectable from view edit UI
- ✅ "Define as cover" shortcut in photo detail panel when viewing from within a view
- ✅ Public views accessible without authentication
- ✅ **Share link** — random token URL `/shared_view/<token>`, read-only access without login; regenerating invalidates previous token
  - ✅ **Link expiration** — optional expiry date; expired links return 403
- ✅ **Custom order** — drag & drop or manual position entry; uses ViewPhotoOrder model
- ✅ **Bulk selection in ViewCreate (edit mode)** — add selection + bulk actions (delete, tag edit, unpublish)
- ✅ ViewDetail: favorite toggle on photo hover
- ✅ ViewDetail: click on photo opens detail panel (DisplayPhoto) with zoom + EXIF + edit

### Home page

- ✅ Logged-in: lists all views (public + private)
- ✅ Not logged-in: lists public views only
- ✅ Each view entry shows: name + cover photo
- ✅ Non-authenticated user can access a private view via its share link
- ✅ **Home vs Views** — home = gallery vitrine (16/9 cards, name overlay, no edit/delete); /views = management UI
- ✅ **Logo clickable** — top-left logo navigates to home

### Tags management

- ✅ Tag colors (tag and group level)
- ✅ Tags managed via YAML editor in admin panel (add / rename / delete tags and groups)
- ✅ Tag & group descriptions — display descriptions as tooltips or info text in tag editor, filter panel, and admin preview

### Admin / Setup page

- ✅ Admin page accessible at any time when logged as admin
  - Access restricted to `is_staff=True` users via `@staff_member_required`
  - Contributor access (group `"contributor"`) restricted to Tags tab only
  - AppBar: "Admin" link visible only to `is_staff` and `contributor` users
  - AppBar: username + role badge displayed in the menu
- ✅ **Tab: Users** (admin only): list, create, delete, force password reset, assign role
- ✅ **Tab: Tags** (admin + contributor): YAML editor, id-based rename-safe sync, "Load sample" banner when empty
- ✅ **Tab: Photo quality** (admin only): RAW_PHOTOS_QUALITY, RAW_PHOTOS_MAX_SIZE, RAW_PHOTO_OVERRIDE_EXISTS, GENERATE_SAMPLES_ON_UPLOAD, SAMPLE_PHOTOS_SETTINGS + Flush samples button, disk usage
- ✅ **Tab: Backup / export**

### Export / Import

- ✅ **Export** — dump all photos to `DUMP_ROOT` (`_meta.yml` + `_exif.yml`, optional raw files); runs in background thread
- ✅ **Import** — scan dump folder and ingest; handles photos without meta; updates existing; re-extracts EXIF; preserves owner

### Backend / API

- ✅ Resample — replaced by Flush samples in admin panel (lazy rebuild on access)
- ✅ Remove `/api/bootstrap` endpoint — replaced by Tags YAML editor
- ✅ Remove troubleshooting endpoints (`hub/views/troubleshooting.py`)
- ✅ Document all env vars in `settings.py`

### Features (done)

- ✅ Panoramic photo handling — handled naturally by the flex grid
- ✅ **Non-JPEG support**
- ✅ **Video support**
  - **Formats**: MP4, MOV and others; re-encoded to MP4/H264 web-optimised (`-movflags +faststart`) at ingestion
  - **Thumbnails**: poster JPG extracted at upload time (available during transcode); same sample system as photos (xs/s/m/l)
  - **Transcode background**: `transcode_status` field (`pending`/`processing`/`done`/`error`); `transcode_pending` daemon in worker container; DB-configurable poll interval, CRF, preset, threads, timeout
  - **Grid**: play icon overlay + duration badge; spinner when `transcode_status != done`
  - **Detail panel**: HTML5 `<video>` player; duration chip; transcode status chip
  - **Upload**: `ALLOW_VIDEO_UPLOAD` toggle (default off); video rejected with clear error when off
  - **Infra**: ffmpeg + ffprobe in Dockerfile; worker service in docker-compose with `cpus` limit
  - **Admin — Video tab**: ALLOW_VIDEO_UPLOAD, poll interval, CRF, preset, threads, timeout; worker status chip; transcode queue stats; retry errors button
  - **Grid filter**: All / Photos / Videos toggle in Photos, ViewDetail, ViewCreate; `filter_media_type` persisted on View model
  - **Backup/restore**: export includes .mp4 + poster JPG + type/duration/dimensions in meta; import handles .mp4
- ✅ **KEEP_ORIGINAL_VIDEO** — `KEEP_ORIGINAL_VIDEO` AppConfig key (bool, default `False`); source saved as `<md5>_original.<ext>`; `Photo.original_ext` field; delete/download/backup handle the original file
- ✅ **Map view** — Leaflet + OpenStreetMap; pins for geolocated photos; popup with thumbnail; click opens DisplayPhoto; entry points in Photos and ViewDetail toolbars
- ✅ **Upload link** — write-access shareable link on a view (`/upload_view/<token>`); auto-applies view tags; photos auto-published; managed from ViewDetail share panel
- ✅ **ZIP download** — download button in ViewDetail; size picker (all samples + raw); streams a ZIP

### Infra / Dev

- ✅ **Favicon & app icon** — custom icon and favicon generated
- ✅ **Open in new tab** — navigation converted to router-link / `<a href>` where needed
- ✅ README reorganised — dev.md created, architecture SVG added
- ✅ Document how to dump DB to `db-init` — see dev.md
