# PhotoHub — TODO

> Legend: ✅ done · 🚧 partial · ⬜ todo

---

## Photos (main gallery view)

- ✅ Filter by tags (TagFilter component)
- ✅ Tag filter: AND by default, optional OR mode (filter_mode=basic/smart)
- ✅ Display all pictures
- ✅ Show photos without tags (filter option — "No tags" mode in filter toggle)
- ✅ One-click: create a view from current active tag filters ("Save as view" button)
- ✅ Selection mode: select multiple photos → bulk action: delete, unpublish, tag editing (reuse post-upload Tag pictures component)

## Photo properties

- ✅ Description (editable from detail panel)
- ✅ Tags (editable from detail panel)
- ✅ **Favorite** — heart button, toggle in detail panel and grid hover, filter in photos view
- ✅ **Rating** — 0 to 5 stars, editable in detail panel, filter with ≤/=/≥ operator in photos view

## Photo display (detail panel)

- ✅ Description field (editable)
- ✅ Edit tags
- ✅ EXIF display
- ✅ GPS: if EXIF contains GPS data, show an "Open in Google Maps" link next to the coordinates
- ✅ GPS shortcut in photo detail header — when GPS data is available, show a map-pin icon button at the top of the detail panel (alongside unpublish/delete) that opens Google Maps directly
- ✅ Favorite (heart) button
- ✅ Rating (stars) widget
- ✅ Define as cover — button in photo detail panel (embedded mode), visible only when viewing from within a view context

## Views

- ✅ **Back button in view detail** — when logged in and viewing a view, show a back button that returns to the views list
- ✅ View has a name and a description/notes (text, markdown)
- ✅ Dynamic: view = tag filters → auto-includes new matching photos
- ✅ Filter config: tags, favorite, rating, filter mode (quick/detailed/notags)
- ✅ Visibility: public or private flag
- ✅ Sort / display order — configurable default, switchable in detail view
- ✅ Cover photo: auto-fallback to first matching photo
- ✅ Create / Edit / Delete / List / Detail UI
- ✅ Cover photo: selectable from view edit UI (grid hover button + mini-card with remove in edit form)
- ✅ "Define as cover" shortcut in photo detail panel when viewing from within a view
- ✅ Public views accessible without authentication (field exists, no unauthenticated route yet)
- ✅ **Share link** (private views): random token URL `/shared_view/<token>`, read-only access without login; regenerating invalidates previous token
  - ✅ **Link expiration** — optional expiry date on share links; expired links return 403; configurable at generation time (no expiry = permanent)
- ✅ **Custom order** — drag & drop or manual position entry; uses ViewPhotoOrder model
- ✅ **Bulk selection in ViewCreate (edit mode)** — add selection + bulk actions (delete, tag edit, unpublish) in the edit view grid; ViewDetail stays read-only; useful for moderating contributor/guest uploads

### Bug fixes needed

- ✅ ViewDetail: add favorite toggle on photo hover (like Photos page)
- ✅ ViewDetail: click on photo should open detail panel (DisplayPhoto component) with zoom + EXIF + edit

## Home page

- ✅ Logged-in: lists all views (public + private)
- ✅ Not logged-in: lists public views only
- ✅ Each view entry shows: name + cover photo
- ✅ Non-authenticated user can access a private view via its share link
- ✅ **Home vs Views** — home = gallery vitrine (16/9 cards, name overlay, no edit/delete); /views = management UI
- ✅ **Logo clickable** — top-left logo navigates to home

## Tags management

- ✅ Tag colors (tag and group level)
- ✅ Tags managed via YAML editor in admin panel (add / rename / delete tags and groups)
- ✅ Tag & group descriptions — display descriptions (defined in YAML) as tooltips or info text in the tag editor, filter panel, and admin preview

## Admin / Setup page

- ✅ Admin page accessible at any time when logged as admin (not only when empty)
  - Access restricted to `is_staff=True` users via `@staff_member_required`
  - Contributor access (group `"contributor"`) restricted to Tags tab only
  - AppBar: "Admin" link visible only to `is_staff` and `contributor` users
  - AppBar: username + role badge displayed in the menu
- ✅ **Full admin panel** — tabbed UI, each tab visible only to users with the required role:

  - ✅ **Tab: Users** (admin only — `is_staff=True`):
    - List all users with their role
    - Create user: username + password, accounts created by admin only (no self-registration)
    - Delete user: photos/views `owner` field reassigned to the deleting admin's username
    - Force password reset: admin sets a new password for any user
    - Assign role to user (admin / contributor / member)
    - Roles via native Django groups (no custom model)
    - Groups `"contributor"` and `"member"` created via data migration on first run

  - ✅ **Tab: Tags** (admin + contributor):
    - YAML editor to add / rename / delete tags and tag groups (id-based rename-safe sync)
    - App starts with no tags — "Load sample" banner when empty
    - Replaces the `/api/bootstrap` endpoint (to be removed)

  - ✅ **Tab: Photo quality** (admin only):
    - Settings editable at runtime, stored in DB (`AppConfig` model, key/value)
    - Env vars set the initial defaults only; once changed here they are no longer read
    - `RAW_PHOTOS_QUALITY` — select: None / web_low / web_medium / web_high / web_maximum
    - `RAW_PHOTOS_MAX_SIZE` — number input (px), empty = None
    - `RAW_PHOTO_OVERRIDE_EXISTS` — toggle
    - `GENERATE_SAMPLES_ON_UPLOAD` — toggle (disable for bulk imports, lazy rebuild on access)
    - `SAMPLE_PHOTOS_SETTINGS` — YAML text editor (name / max_size / quality per sample)
      + **Flush samples** button to delete all samples (lazy rebuild on next access)
    - Read-only info: `MEDIA_ROOT`, `DUMP_ROOT`, disk usage bar

  - **Tab: Backup / export** (admin only):
    - See Export / Import section below

## Export / Import

Goal: portability of photos across PhotoHub instances or external apps.
Views, users, and other app state → handled via a separate DB dump outside the app.

- ✅ **Export** — dump all photos to `DUMP_ROOT` folder:
  - `<filename>_meta.yml` — tags, favorite, rating, description, owner, published
  - `<filename>_exif.yml` — EXIF data (informational only)
  - Optional: include raw `.jpg` files (toggle in admin UI)
  - Runs in background thread
- ✅ **Import** — scan dump folder and ingest into PhotoHub:
  - Photos without `_meta.yml` accepted (raw only)
  - If photo already exists (same filename): updates metadata only
  - New photos: EXIF re-extracted from raw, samples regenerated per GENERATE_SAMPLES_ON_UPLOAD
  - Owner preserved from meta

## Backend / API

- ✅ Resample — replaced by Flush samples in admin panel (lazy rebuild on access)
- ✅ Remove `/api/bootstrap` endpoint — replaced by Tags YAML editor in admin panel
- ✅ Remove troubleshooting endpoints (`hub/views/troubleshooting.py`)
- ✅ Document all env vars in `settings.py`

## Future / Ideas
- ✅ Panoramic photo handling — handled naturally by the flex grid (item width scales with aspect ratio)
- ⬜ Non-JPEG support — `save_photo` in `hub/utils.py` only handles JPEG
- ✅ **Video support** — `Photo.type` field already in model
  - **Formats**: MP4, MOV and others accepted via ffmpeg; re-encoded to MP4/H264 web-optimised (`-movflags +faststart`) at ingestion
  - **Thumbnails**: poster JPG extracted by ffmpeg at t=0, stored in raw/ alongside .mp4; same sample system as photos (xs/s/m/l); used in all grids identically
  - **Transcode background**: `transcode_status` field (`pending`/`processing`/`done`/`error`); `transcode_pending` management command runs as foreground daemon in worker container; DB-configurable poll interval, CRF, preset, threads
  - **Grid**: play icon overlay + duration badge; spinner when `transcode_status != done`
  - **Detail panel**: HTML5 `<video>` player; duration chip; transcode status chip
  - **Upload**: same upload page; `ALLOW_VIDEO_UPLOAD` toggle (default off); video rejected with clear error when off
  - **Infra**: ffmpeg + ffprobe in Dockerfile; worker service in docker-compose with `cpus` limit
  - **Admin panel — Video tab**: ALLOW_VIDEO_UPLOAD, poll interval, CRF, preset, threads; worker status chip (online/encoding/offline + elapsed time); transcode queue stats table; retry errors button
  - **Grid filter**: All / Photos / Videos toggle in Photos, ViewDetail, ViewCreate; `filter_media_type` persisted on View model
  - **Backup/restore**: export includes .mp4 + poster JPG + type/duration/dimensions in meta; import handles .mp4 files
  - ⬜ **KEEP_ORIGINAL_VIDEO** — optional setting to preserve the source file before transcoding:
    - `KEEP_ORIGINAL_VIDEO` AppConfig key (bool, default `False`); configurable live in Admin → Video tab with a disk usage warning
    - When enabled at upload time: source file saved as `<md5>_original.<ext>` in `raw/`; extension stored in new `Photo.original_ext` DB field
    - Setting is per-upload: toggling it off later does not affect videos already uploaded with originals (field `original_ext` drives behaviour, not the current setting)
    - **Delete**: `delete_video_files()` helper removes `.mp4` + poster `.jpg` + `_original.<ext>` (if `original_ext` set) — single place for full lifecycle
    - **ZIP download**: `size=raw` serves `_original.<ext>` if available, otherwise falls back to transcoded `.mp4`; other sizes always serve transcoded `.mp4`
    - **Backup/restore**: export includes `_original.<ext>` if present + `original_ext` in meta; import restores it
- ✅ **Map view** — Leaflet + OpenStreetMap map accessible from ViewDetail; shows a pin for each photo that has GPS EXIF data (Photos page map: future)
 shows a pin for each photo that has GPS EXIF data:
  - **Entry points**: map icon button in Photos toolbar and ViewDetail toolbar (only visible if at least one photo has GPS data)
  - **Display**: fullscreen dialog (same pattern as DisplayPhoto), map fills the space
  - **Pins**: each photo with GPS coords gets a marker; marker popup shows a small thumbnail (xs sample) + filename
  - **Click on popup / pin**: opens the photo in DisplayPhoto (fullscreen viewer)
  - **Library**: Leaflet + OpenStreetMap tiles (no API key required)
  - **Backend**: reuse existing EXIF data already stored in DB (`Exif` model, keys `GPSLatitude`, `GPSLongitude` or similar); new endpoint `GET /api/views/<id>/photos/map` and `GET /api/photos/map` returning only photos with GPS coords + their coordinates parsed to decimal degrees
  - **GPS parsing**: EXIF GPS values are stored as DMS strings (e.g. `51/1, 30/1, 0/1`) — backend converts to decimal on the fly
  - **Auth**: same access rules as the parent context (public view = accessible without login, shared/upload token = token validated)
- ⬜ **Filter by owner** — photos and views have an `owner` field (username); future UI to filter/isolate content by owner; currently ignored — all authenticated users see all content
- ⬜ Pagination or infinite scroll — TBD based on performance and UX
- ✅ **Upload link** — second shareable link on a view (write access), separate from the existing read-only share link:
  - Two independent links per view: **read link** (existing `share_link`) and **write/upload link** (new `upload_link` UUID token)
  - The upload link page (`/upload_view/<token>`) shows the view in read mode + an Upload button
  - Upload flow: same UI as the current Upload page, in the context of the view; after upload shows "X photos uploaded" + "Go to view" button
  - Auto-applies view's `filter_tags` to uploaded photos (not rating/favorite); photos are auto-published
  - Moderation: via bulk selection in ViewCreate edit mode (already implemented)
  - No expiry (keep simple)
  - **Model**: new `upload_link` (UUID, nullable) field on `View`
  - **Backend**:
    - `GET /api/upload_view/<token>/photos` — read access via upload token (same as shared view)
    - `POST /api/upload_view/<token>/upload` — upload + auto-tag + auto-publish
    - Generate / revoke upload link endpoints (mirroring share_link endpoints)
  - **Frontend — ViewDetail share panel**: existing share link section gains a Write subsection (collapsible) for upload link management (generate / copy / revoke); same UX pattern as read link
  - **Frontend — upload link page**: route `/upload_view/<token>`; displays the view + Upload button; after upload reloads the view photos
- ⬜ **Multi-view group link** — a shareable link that bundles multiple private views into a single public page; create/edit/delete the group, select which views to include, regenerate/revoke the link; displayed folded at the bottom of the Views page
  - **Link expiration** — optional expiry date (same concept as above)
- ✅ **ZIP download** — download button in ViewDetail; size picker (all samples + raw); streams a ZIP of all view photos at the selected size

## Infra / Dev

- ⬜ README — ASCII schema of docker-compose dev setup
- ⬜ README — document how to dump DB to `db-init`
- ✅ **Favicon & app icon** — generate a custom icon and favicon for the site
  - Prompt for ChatGPT/DALL-E:
    Create a minimal, modern logo for a self-hosted private photo gallery web app called **PhotoHub**.
    Constraints: flat vector style, geometric, no gradients, no drop shadows. Must work as a favicon at 16×16 and 32×32px. Works on both light and dark backgrounds. Maximum 2 colors.
    Colors: primary deep violet/purple (#6750A4), secondary white or very light neutral, background transparent.
    Deliverables: SVG icon (square, no text), SVG wordmark (icon + "PhotoHub" in a clean sans-serif), favicon variant (simplified for small sizes).
    Creative direction: feel free to interpret "photo" and "hub" freely — it doesn't have to be a camera or a lens. Think about concepts like collection, light, memory, connection, archive, gallery, sharing. The result should feel like a modern SaaS product icon — think Linear, Vercel, Notion level of simplicity and confidence. Surprise me.
    Do NOT use: realistic illustrations, lens flare, gradients, more than 2 colors, overly complex shapes.
- ✅ **Open in new tab** — most links can't be opened in a new tab via Chrome (middle-click / right-click → open in new tab); investigate: likely `@click` handlers replacing `<a href>` — convert navigation to router-link or `<a>` where possible
