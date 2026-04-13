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

- ⬜ **Back button in view detail** — when logged in and viewing a view, show a back button that returns to the views list
- ✅ View has a name and a description/notes (text, markdown)
- ✅ Dynamic: view = tag filters → auto-includes new matching photos
- ✅ Filter config: tags, favorite, rating, filter mode (quick/detailed/notags)
- ✅ Visibility: public or private flag
- ✅ Sort / display order — configurable default, switchable in detail view
- ✅ Cover photo: auto-fallback to first matching photo
- ✅ Create / Edit / Delete / List / Detail UI
- ✅ Cover photo: selectable from view edit UI (grid hover button + mini-card with remove in edit form)
- ✅ "Define as cover" shortcut in photo detail panel when viewing from within a view
- ⬜ Public views accessible without authentication (field exists, no unauthenticated route yet)
- ⬜ **Share link** (private views): random token URL `/shared_view/<token>`, read-only access without login; regenerating invalidates previous token
- ✅ **Custom order** — drag & drop or manual position entry; uses ViewPhotoOrder model

### Bug fixes needed

- ✅ ViewDetail: add favorite toggle on photo hover (like Photos page)
- ✅ ViewDetail: click on photo should open detail panel (DisplayPhoto component) with zoom + EXIF + edit

## Home page

- ⬜ Logged-in: lists all views (public + private)
- ⬜ Not logged-in: lists public views only
- ⬜ Each view entry shows: name + cover photo
- ⬜ Non-authenticated user can access a private view via its share link
- ⬜ **Home vs Views** — currently home has the same content as Views; decide: add distinct home content (featured views, stats, recent uploads?) or remove home and redirect to Views
- ⬜ **Logo clickable** — top-left logo should be a link/router-link redirecting to home

## Tags management

- ✅ Tag colors (tag and group level)
- ⬜ Tags currently managed via YAML at app init
- ⬜ Future: tag management UI for logged-in users (add / delete / rename tags and groups)

## Admin / Setup page

- ⬜ Admin page accessible at any time (not only when empty)
- ⬜ Configure compression rates and other settings hard to change via env vars
- ⬜ Inject default tags via YAML or a custom UI
- ⬜ **Full admin panel** — tabbed UI covering:
  - Backup / export (photos + metadata)
  - User management (create / delete users)
  - Tag management (add / rename / delete tags and groups)
  - Photo quality settings (compression rates, resize dimensions) — or read-only config summary if too complex to edit live (TBD)

## Export / Import

- ⬜ Export/import photos and tags (endpoint exists)
- ⬜ Update to include all photo properties: favorites, rating, description, tags
- ⬜ Update to include view definitions (name, description, visibility, share links, cover, order)
- ⬜ **ZIP download** — generate and download a zip of photos; scope TBD: current filter/selection in Photos, a full view, or a manual selection; photo size selectable (raw, medium, small sample)

## Backend / API

- ⬜ Resample — admin URL missing; force-resample all photos
- ⬜ Panoramic photo handling — special resize/display if ratio > 1/3
- ⬜ Non-JPEG support — `save_photo` in `hub/utils.py` only handles JPEG
- ⬜ Video support — `Photo.type` field already in model
- ⬜ Remove troubleshooting endpoints (`hub/views/troubleshooting.py`)
- ⬜ Document all env vars in `settings.py`

## Future / Ideas

- ⬜ Show tags in grid thumbnail — TBD: colors only, tag names, hover tooltip?
- ⬜ Map view — display all photos with GPS data on a global map
- ⬜ **View map** — Google Maps page for a specific view: show all photos that have GPS data as markers on a map, clicking a marker opens the photo detail
- ⬜ Pagination or infinite scroll — TBD based on performance and UX
- ⬜ Future: create a view from a manual selection of specific photos
- ⬜ Future: public link grouping multiple private views. Something that could be in view, a way to create a multi view link and edit it. A random link where you can select views to display. Can be edited / regenerated / deleted. With a small display of all linked views. Could be something folded by default at the bottom of the views page


## Infra / Dev

- ⬜ README — ASCII schema of docker-compose dev setup
- ⬜ README — document how to dump DB to `db-init`
- ⬜ **Favicon & app icon** — generate a custom icon and favicon for the site
- ⬜ **Open in new tab** — most links can't be opened in a new tab via Chrome (middle-click / right-click → open in new tab); investigate: likely `@click` handlers replacing `<a href>` — convert navigation to router-link or `<a>` where possible
- ⬜ **Menu: current user** — replace hardcoded "John Leider" with actual logged-in username; clean up unused menu items
