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
- ✅ **Custom order** — drag & drop or manual position entry; uses ViewPhotoOrder model

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
- ⬜ Tags currently managed via YAML at app init
- ⬜ Future: tag management UI for logged-in users (add / delete / rename tags and groups)

## Admin / Setup page

- ⬜ Admin page accessible at any time when logged as admin (not only when empty)
  - Access restricted to `is_staff=True` users via `@staff_member_required`
  - Contributor access (group `"contributor"`) restricted to Tags tab only
  - User created via `DJANGO_SUPERUSER_USERNAME` in entrypoint automatically has `is_staff=True`
  - AppBar: add "Admin" link, visible only to `is_staff` and `contributor` users
  - AppBar: display username + role badge next to it in the menu
- ⬜ **Full admin panel** — tabbed UI, each tab visible only to users with the required role:

  - **Tab: Users** (admin only — `is_staff=True`):
    - List all users with their role
    - Create user: username + password, accounts created by admin only (no self-registration)
    - Delete user: photos/views `owner` field reassigned to the deleting admin's username
    - Force password reset: admin sets a new password for any user
    - Assign role to user (admin / contributor / member)
    - Roles via native Django groups (no custom model):
      - **Admin** — `is_staff=True` (via `createsuperuser` entrypoint) — full access
      - **Contributor** — Django group `"contributor"` — full app access (upload, photos, views)
        but admin panel restricted to Tags tab only
      - **Member** — Django group `"member"` — read-only; sees public and private views +
        photo detail (including EXIF) once logged in; cannot upload, edit, or access admin
    - Groups `"contributor"` and `"member"` created via data migration on first run
    - Check pattern: `is_staff` for admin, `user.groups.filter(name='contributor')` for contributor

  - **Tab: Tags** (admin + contributor):
    - YAML editor to add / rename / delete tags and tag groups
    - App starts with no tags — admin creates them via this editor
    - A `bootstrap/example-tags.yml` provided in the repo as a reference to copy-paste
    - Replaces the `/api/bootstrap` endpoint (to be removed)

  - **Tab: Photo quality** (admin only):
    - Settings editable at runtime, stored in DB (`AppConfig` model, key/value)
    - Env vars set the initial defaults only; once changed here they are no longer read
    - `settings.py` doc to be updated: "Initial default value — can be overridden at runtime via admin"
    - `RAW_PHOTOS_QUALITY` — select: None / web_low / web_medium / web_high / web_maximum
    - `RAW_PHOTOS_MAX_SIZE` — number input (px), empty = None
    - `RAW_PHOTO_OVERRIDE_EXISTS` — toggle
    - `SAMPLE_PHOTOS_SETTINGS` — YAML text editor (name / max_size / quality per sample)
      + **Resample all** button to regenerate all existing samples with new settings
    - Read-only info: `MEDIA_ROOT`, `DUMP_ROOT`, disk usage

  - **Tab: Backup / export** (admin only):
    - See Export / Import section below

## Export / Import

Goal: portability of photos across PhotoHub instances or external apps.
Views, users, and other app state → handled via a separate DB dump outside the app.

- ⬜ **Export** — dump selected or all photos to `DUMP_ROOT` folder:
  - Raw photo file
  - `<filename>_meta.yml` — tags, favorite, rating, description
  - `<filename>_exif.yml` — EXIF data (informational only, not used on re-import)
  - Reuses / replaces existing `admin.dump` endpoint (currently outputs YAML per photo)
- ⬜ **Import** — read a dump folder and ingest into PhotoHub:
  - Photos without `_meta.yml` are accepted (raw only, no metadata)
  - If photo already exists (same MD5): override tags, favorite, rating, description
  - EXIF re-extracted from raw file on import (ignore `_exif.yml`)
  - Samples regenerated via normal upload process
- ⬜ **ZIP download** — generate and download a zip of photos; scope TBD: current filter/selection in Photos, a full view, or a manual selection; photo size selectable (raw, medium, small sample)

## Backend / API

- ⬜ Resample — move to admin panel "Photo quality" tab (Resample all button)
- ⬜ Remove `/api/bootstrap` endpoint — replaced by Tags YAML editor in admin panel
- ⬜ Remove troubleshooting endpoints (`hub/views/troubleshooting.py`)
- ⬜ Panoramic photo handling — special resize/display if ratio > 1/3
- ⬜ Non-JPEG support — `save_photo` in `hub/utils.py` only handles JPEG
- ⬜ Video support — `Photo.type` field already in model
- ✅ Document all env vars in `settings.py`

## Future / Ideas

- ⬜ Show tags in grid thumbnail — TBD: colors only, tag names, hover tooltip?
- ⬜ Map view — display all photos with GPS data on a global map
- ⬜ **View map** — Google Maps page for a specific view: show all photos that have GPS data as markers on a map, clicking a marker opens the photo detail
- ⬜ Pagination or infinite scroll — TBD based on performance and UX
- ⬜ Future: create a view from a manual selection of specific photos
- ⬜ Future: public link grouping multiple private views. Something that could be in view, a way to create a multi view link and edit it. A random link where you can select views to display. Can be edited / regenerated / deleted. With a small display of all linked views. Could be something folded by default at the bottom of the views page
- ⬜ Question to be defined and see if we resolve them:
  - Possible de désactiver unpublish? 
  - Upload link auto createvtag and vieux 
  - Garder unpublish si on peut filtrer no tags?


## Infra / Dev

- ⬜ README — ASCII schema of docker-compose dev setup
- ⬜ README — document how to dump DB to `db-init`
- ⬜ **Favicon & app icon** — generate a custom icon and favicon for the site
- ⬜ **Open in new tab** — most links can't be opened in a new tab via Chrome (middle-click / right-click → open in new tab); investigate: likely `@click` handlers replacing `<a href>` — convert navigation to router-link or `<a>` where possible
- ⬜ **Menu: current user** — replace hardcoded "John Leider" with actual logged-in username; clean up unused menu items
