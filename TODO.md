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
- ⬜ Panoramic photo handling — special resize/display if ratio > 1/3 ?
- ⬜ Non-JPEG support — `save_photo` in `hub/utils.py` only handles JPEG
- ⬜ Video support — `Photo.type` field already in model
- ⬜ Show tags in grid thumbnail — TBD: colors only, tag names, hover tooltip?
- ⬜ Map view — display all photos with GPS data on a global map
- ⬜ **View map** — Google Maps page for a specific view: show all photos that have GPS data as markers on a map, clicking a marker opens the photo detail
- ⬜ **Filter by owner** — photos and views have an `owner` field (username); future UI to filter/isolate content by owner; currently ignored — all authenticated users see all content
- ⬜ Pagination or infinite scroll — TBD based on performance and UX
- ⬜ Future: create a view from a manual selection of specific photos
- ⬜ **Upload link** — shareable link allowing anyone (no account) to upload photos into a specific context:
  - Two modes:
    - **View-scoped**: linked to a view; uploaded photos are auto-tagged to match the view's tag filters and auto-published; uploaders see their photos appear immediately in the view
    - **Generic**: not linked to a view; uploaded photos land in Unpublished as usual (owner curates manually)
  - Link management: generate / revoke (like private view share links)
  - **Link expiration** — optional expiry date (same concept as view share link expiration)
  - Moderation: owner can delete/edit photos uploaded by guests via bulk selection in ViewDetail or Photos filter
- ⬜ **Multi-view group link** — a shareable link that bundles multiple private views into a single public page; create/edit/delete the group, select which views to include, regenerate/revoke the link; displayed folded at the bottom of the Views page
  - **Link expiration** — optional expiry date (same concept as above)
- ⬜ **ZIP download** — generate and download a zip of photos; scope TBD: current filter/selection in Photos, a full view, or a manual selection; photo size selectable (raw, medium, small sample)

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
- ⬜ **Open in new tab** — most links can't be opened in a new tab via Chrome (middle-click / right-click → open in new tab); investigate: likely `@click` handlers replacing `<a href>` — convert navigation to router-link or `<a>` where possible
