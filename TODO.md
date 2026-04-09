# PhotoHub — TODO

> Legend: ✅ done · 🚧 partial · ⬜ todo

---

## Photos (main gallery view)

- ✅ Filter by tags (TagFilter component)
- ✅ Tag filter: AND by default, optional OR mode (filter_mode=basic/smart)
- ✅ Display all pictures
- ⬜ Pagination or infinite scroll — TBD based on performance and UX
- ⬜ Show photos without tags (filter option)
- ⬜ One-click: create a view from current active tag filters
- ⬜ Future: create a view from a manual selection of specific photos
- ⬜ Selection mode: select multiple photos → bulk tag editing (reuse post-upload Tag pictures component)

## Photo properties

- ✅ Description (editable from detail panel)
- ✅ Tags (editable from detail panel)
- 🚧 **Favorite** — heart button (boolean), quick toggle on photo and in grid, usable as filter to build views (detail panel + grid shortcut done, filter pending)
- 🚧 **Rating** — 0 to 5 stars per photo, usable as filter to build views (detail panel done, filter pending)

## Photo display (detail panel)

- ✅ Description field (editable)
- ✅ Edit tags
- ✅ EXIF display
- ✅ GPS: if EXIF contains GPS data, show an "Open in Google Maps" link next to the coordinates
- ✅ Favorite (heart) button
- ✅ Rating (stars) widget
- ⬜ Define as cover — only shown when viewing from within a view context (not from global All photos); if too complex to pass context down, fallback: allow selecting cover photo directly from the view edit UI

## Views

- ⬜ View has a name and a description/notes (text)
- ⬜ Cover photo: selectable from view config, or via "Define as cover" shortcut in photo detail (only when inside a view); fallback to first photo
- ⬜ Dynamic: view = tag filters → auto-includes new matching photos
- ⬜ **Visibility: public or private**
  - Public: accessible in read-only to any non-authenticated visitor via the normal view URL
  - Private: accessible only to logged-in users; can generate a share link
- ⬜ **Share link** (private views only): random token URL `/shared_view/<token>`, read-only access without login; regenerating invalidates the previous token
- ⬜ **Sort / display order** — predefined criteria switchable at any time: photo date, upload date, rating, file size, with/without tags
- ⬜ **Custom order** — edit mode with drag & drop or manual position entry; first manual reorder creates a custom order inherited from global order

## Home page

- ⬜ Logged-in: lists all views (public + private)
- ⬜ Not logged-in: lists public views only
- ⬜ Each view entry shows: name + cover photo
- ⬜ Non-authenticated user can access a private view via its share link
- ⬜ Future: public link grouping multiple private views

## Tags management

- ✅ Tag colors (tag and group level)
- ⬜ Tags currently managed via YAML at app init
- ⬜ Future: tag management UI for logged-in users (add / delete / rename tags and groups)

## Admin / Setup page

- ⬜ Admin page accessible at any time (not only when empty)
- ⬜ Configure compression rates and other settings hard to change via env vars
- ⬜ Inject default tags via YAML or a custom UI

## Export / Import

- ⬜ Export/import photos and tags (endpoint exists)
- ⬜ Update to include all photo properties: favorites, rating, description, tags
- ⬜ Update to include view definitions (name, description, visibility, share links, cover, order)

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
- ⬜ Smart search

## Infra / Dev

- ⬜ README — ASCII schema of docker-compose dev setup
- ⬜ README — document how to dump DB to `db-init`
- ⬜ Change app favicon
