# PhotoHub — E2E Test Coverage

Total: **~201 tests** across 7 spec files. (~71 tests added covering admin, new filters, fullscreen UX, download menu, upload link decoupling, and video; +5 guest-upload tests; +1 video capture-date.)

> Tests in the new `admin.spec.ts` and `video.spec.ts` files, plus the new `describe` blocks at the bottom of the older specs, mutate live state through the API helpers in `e2e/helpers.ts`. They clean up after themselves (`afterAll` hooks) but assume a working DB and, for video tests, a healthy transcode worker.

---

## Authentication (`auth.spec.ts` — 4 tests)
- Unauthenticated access to `/photos` redirects to `/login`
- Login with valid credentials succeeds and lands outside `/login`
- Login with invalid credentials stays on `/login` (error shown)
- Logout via nav menu redirects to `/login`

---

## Home & AppBar (`home.spec.ts` — 15 tests)

### Home — authenticated (4 tests)
- Gallery grid is visible when views exist
- Gallery card shows name overlay
- Clicking a gallery card navigates to view detail
- Empty state shows "Create your first view" when no views exist

### Home — unauthenticated (3 tests)
- Home page loads without login (no redirect)
- No "New view" button visible when not logged in
- Public views are visible without authentication (guards against private-only views)

### AppBar — logo (1 test)
- Logo click navigates to home from another page

### AppBar — unauthenticated menu (3 tests)
- Menu shows Login item when not logged in
- Menu hides auth-only items (Upload, Photos, Logout) when not logged in
- Login item in menu navigates to login page

### AppBar — authenticated menu (4 tests)
- Menu shows username when logged in
- Menu shows all auth items (Photos, Views, Upload, Logout)
- Menu does not show Login item when logged in
- Dark theme toggle is visible in menu

---

## Upload & Unpublished (`upload-publish.spec.ts` — 15 tests)

### Upload (4 tests)
- Upload page loads, heading visible, Upload button disabled before file selection
- Upload a single JPEG: success snackbar appears, filename visible in result list
- Quick-navigate to Unpublished via icon button after upload
- Upload multiple files at once: success snackbar with file count

### Unpublished queue (11 tests)
- Page shows heading and subtitle
- Select all → Deselect all (counter resets to 0)
- Deselect all activates after selecting a single photo
- Favorite button appears on photo hover
- Toggle favorite on hover: click toggles state, click again reverts
- Bulk add to favorites: runs without error, selection cleared after
- Bulk remove from favorites: runs without error, selection cleared after
- Open photo detail panel via Details button (navigation drawer opens)
- Select a photo and publish it (count decreases by 1)
- Delete an unpublished photo (count decreases by 1)
- Select all and publish all (queue empties to 0)

---

## Photos (`photos.spec.ts` — 40 tests)

### Grid & display (6 tests)
- Published photos appear in a grid
- Clicking a photo opens the fullscreen dialog (`?displayPhoto=` in URL)
- Close button in the dialog toolbar returns to the grid
- Favorite button appears on photo hover (`.favorite-btn`)
- Favorite toggle on hover: click toggles state, reverts correctly
- Grid size slider: adjusting it keeps the grid rendered

### Sort (3 tests)
- Sort by Photo date
- Sort by Upload date
- Toggle sort direction (asc ↔ desc)

### Filters (14 tests)
- Quick filter mode is active by default
- Switch to Detailed filter mode (expand panel appears)
- Switch to No filter mode (show all) — URL gets `filter_mode=none`
- Switch to No tags filter mode (grid updates)
- Filter by favorite — URL updates with `favorite=true`
- Filter by rating — URL updates with `rating=N`
- Rating mode toggle cycles between ≤ and = operators
- Sort change updates URL with `sort_by=...`
- URL params restore favorite filter on reload
- URL params restore rating filter on reload
- URL params restore sort on reload
- URL params restore no-tags filter mode on reload
- "Save as view" button is visible in the filter bar
- "Save as view" navigates to `/views/create` with filter state pre-filled

### Selection mode (9 tests)
- Enter and exit selection mode
- Select a single photo → counter shows "1 selected"
- Select all → counter shows total count
- Deselect all → counter resets to 0
- Deselect all activates after selecting a single photo
- Bulk unpublish: confirm dialog appears, cancel aborts
- Bulk delete: confirm dialog appears, cancel aborts
- Bulk "Add to favorites": action runs, selection clears
- Bulk "Remove from favorites": action runs, selection clears
- Bulk unpublish actually removes photos from the grid

### Photo detail panel (8 tests)
- Detail panel opens and shows filename
- Favorite toggle in detail panel: click + revert
- Set rating (4 stars) and revert to 0
- Edit description: fill, blur to save, revert
- Unpublish from detail panel: confirm dialog → API 200 → dialog closes
- EXIF section is visible in detail panel
- Navigate to next photo with carousel arrow (if available)

---

## Views (`views.spec.ts` — 50 tests)

### Views — list (5 tests)
- Page shows heading and "New view" button
- Empty state shows "Create your first view" CTA when no views exist
- View card shows name and photo count
- View card hover reveals edit and delete buttons
- "New view" button navigates to `/views/create`

### Views — create (11 tests)
- Save button is disabled when name is empty
- Cancel navigates back to the views list
- Create a view with only a name → redirects to view detail
- Create a view with description, public toggle and sort → saves correctly
- Create a view with No tags filter mode → saves correctly
- Create a view with favorite filter → saves correctly
- Create a view with No filter mode → saves correctly
- Create a view with rating filter → filter chip visible in detail
- Preview grid photo count updates when filter mode changes
- Preview grid respects sort selection
- "Save as view" from Photos page pre-fills filter state in the form

### Views — detail (11 tests)
- View detail shows name, photo count and Public/Private badge
- Filter chips toggle button shows/hides active filter chips
- Description toggle button shows/hides the markdown description
- Sort controls are visible
- Grid size slider is visible
- Clicking a photo opens the fullscreen dialog
- Favorite button appears on photo hover
- Edit button navigates to `/views/:id/edit`
- Delete button opens confirm dialog, cancel aborts
- Changing sort re-orders photos
- "Define as cover" button visible in photo detail panel from view context

### Views — edit (7 tests)
- Edit page pre-fills name from the existing view
- Edit page pre-fills filter mode (Quick active by default)
- Cancel navigates back to view detail
- Edit name and save: API returns 200, view detail shows new name
- Edit sort and verify it persists on reload
- Changing sort in edit page updates the preview photo count
- Set cover photo from grid: cover mini-card appears in header

### Views — custom order (5 tests)
- "Custom order" button is visible in edit view sort bar (State A)
- Clicking "Custom order" enters drag mode (drag handles visible)
- "Done" exits drag mode and "Reorder" button appears (State B)
- "Custom order" option available in ViewDetail sort controls when order exists
- Delete custom order reverts to normal sort (State A restored)

### Views — delete (1 test)
- Create a view, go to list, hover card, click delete, confirm → card disappears

### Views — public access (3 tests)
- Public view is accessible without authentication
- Public view shows no edit or delete buttons
- Invalid numeric view ID shows "View not found" error

### Views — share link (7 tests)
- Share button is visible for private views (authenticated)
- Generate a share link: URL field appears with a copyable link
- Share link accessible without login (read-only, no edit/delete buttons)
- Invalid token shows "This shared link is no longer valid"
- Share icon appears on view card in list after link is generated
- Regenerate shows confirmation warning; Cancel aborts without regenerating
- Revoke share link: URL field disappears, share icon outline restored

### Views — map (0 tests — TODO)
- Map button visible in ViewDetail toolbar
- Map button not visible when no photos have GPS data
- Map opens as fullscreen dialog with OSM tiles loaded
- Pins appear for photos with GPS data
- Click on pin opens popup with thumbnail
- Click on thumbnail opens photo in fullscreen viewer
- Closing photo viewer returns to map (map stays open)
- Map accessible in shared view context (token validated)
- Map accessible in public view context
- Map button visible in upload view context

### Views — upload link (0 tests — TODO)
- Upload link section is collapsed by default in share menu
- Upload link section is disabled (greyed out) when no share link exists
- Generate upload link requires an active share link
- Generate upload link: URL field appears with a copyable link
- Upload link page shows same layout as shared view + Upload button
- Upload via valid token: file picker → progress → success dialog
- Revoking share link also revokes upload link (section shows inactive)
- Upload via revoked token shows invalid/expired error
- Upload via expired token shows invalid/expired error
- Photo detail panel accessible on upload view (info button opens panel)

### Views — guest upload via upload link (5 tests)
- Anonymous JPEG upload via upload link (fresh context, no session, no csrftoken cookie) returns 201
- Anonymous video upload via upload link when ALLOW_VIDEO_UPLOAD=true returns 201
- Anonymous video upload via upload link when ALLOW_VIDEO_UPLOAD=false rejected with 400
- Anonymous upload with an invalid/revoked token returns 403
- Logged-in admin opening the upload link sees admin controls (back-to-views, download menu) — was hidden before fix

---

## What is NOT tested

### Features not covered by E2E tests

**Photos**
- Tag filtering with Quick autocomplete (selecting specific tags from the dropdown)
- Tag filtering with the Detailed panel (TagFilter component logic)
- URL restore for `filter_mode=detail` on reload
- "Delete" bulk action actually deleting (only confirm dialog tested)
- "Tag" bulk action opening the tag editor
- Editing tags from the detail panel (EditTagsDialog)
- GPS "Open in Google Maps" button (requires photo with GPS EXIF data)
- AND/OR toggle in quick filter — match-all vs match-any of selected tags, URL persists `tags_match=all|any`
- Tag exclude tri-state chips — neutral → include → exclude cycle on chip click
- Per-group "no tag" toggle in the quick filter dropdown — filters photos with no tag in that group
- "Clear all tags" button resets every active include/exclude tag in one click
- Quick filter dropdown groups tags by `tag_group` with subheader and divider between groups
- `showAllTags` regression — toggle reveals every tag (not just the active ones) without breaking the chip state
- Orphan filter — `orphan=true` URL param shows only photos that match no view; persists on reload
- Sort: "Mixed" option (renamed from Random) preserves the previous shuffle ordering
- Sort: true "Random" option produces a different order on each reload (SQL `ORDER BY RANDOM`)
- Sort: "Origin filename" option sorts by `origin_filename` field
- Sort: default direction is ascending (regression — direction toggle starts at asc, not desc)
- Fullscreen: deleting the current photo advances to the next one (viewer stays open) instead of closing
- Fullscreen: closing the viewer restores the grid scroll position to the photo that was open
- Photo detail download menu — sample sizes (xs / s / m / l) and raw original each download the correct file

**Upload**
- Duplicate file upload (same MD5 → "Picture already exist" response)
- Non-JPEG file rejection
- Large file or network error handling
- WEBP / non-JPEG image auto-conversion (PIL converts to JPEG before saving)
- DPI field missing or `None` in EXIF — upload should not crash (PIL `save()` without dpi kwarg)
- GPS ref null-byte suffix (`'N\x00'`) — upload should not crash on malformed EXIF
- EXIF date in unrecognised format — upload continues with `date=None` instead of crashing
- System files (`.DS_Store`, `Thumbs.db`, `desktop.ini`, files starting with `.`) silently skipped, no error notification
- GPS EXIF with null or zero coordinates accepted without crashing (lat/lon=0 or None)
- Per-file error handling: a single failed file does not abort the rest of the batch; each failure surfaces its own alert
- `exif=None` on save path — upload completes when PIL returns no EXIF block

**Views**
- Bulk selection actions in ViewCreate edit mode (tag, delete, unpublish, favorites)
- Custom order: actual drag & drop reorder (HTML5 drag events unreliable in Playwright)
- Custom order: save persists and is restored on reload
- Tag filter in views (creating a view with specific tags, verifying filter is applied)
- ViewDetail: selection mode toggle — bulk actions (favorite, rating, tag, delete, unpublish) work the same as on Photos
- ViewDetail: bulk-action row is right-aligned, matching Photos and Unpublished layout
- ViewDetail: server-side sort — changing sort sends `sort_by` to the API instead of resorting client-side, photo order reflects the new request
- ViewDetail: AND/OR tag-match toggle persists in the view config and applies on reload
- Upload link decoupled from share link — upload link can be generated and used even when no share link exists
- Upload link allowed on **public** views — generating the link does not require the view to be private
- Revoking the share link no longer revokes the upload link (and vice versa)

**Tags**
- Tag & group description tooltips (hover on info icon in filter panel and tag editor)
- Browser autocomplete disabled on tag combobox / autocomplete inputs (`autocomplete="off"` so the browser does not suggest stale values)
- EditTagsDialog pre-selects the photo's current tags when opened (regression — they were missing after recent refactor)
- TagPhotos adaptive grid size on mobile — chips wrap correctly, full-width groups, combobox `max-width` respected
- TagGroupsWidget unified component renders both the filter panel and tag editor with the same chip / close behaviour

**Photos / Gallery page size**
- Warning chip appears when total photos > configured limit (backend cap hit)
- Cap respected per device type (desktop vs mobile limit differ)
- Changing filters reloads within the new limit
- `loading="lazy"` defers off-screen image requests (visual / network-level check)

**Admin**
- Admin panel tabs (Users, Tags, Photo quality, Backup/Export, Video)
- User create/delete/password reset

**Admin → Tags tab (YAML editor)**
- Empty state: "No tags yet" alert + "Load sample" button visible; clicking populates DB from `tags_sample.yml`
- Active tab persists in URL query param (`?tab=tags`)
- Tab is default for `contributor` role; hidden for `member` and anonymous
- Add a new tag group via YAML — group appears in the Preview widget after save, then in filter bar and tag editor on reload
- Add a new tag inside an existing group via YAML — tag appears in Preview, filter dropdown, and tag editor
- Rename a tag while keeping its `id` — photo→tag associations preserved (regression — id-based rename test)
- Rename a tag group while keeping its `id` — group's tags and photo associations preserved
- Remove a tag from YAML and save → tag deleted from DB and removed from every photo that carried it
- Remove a tag group from YAML and save → group + its tags deleted, photos no longer carry those tags
- `type: checkbox` → group renders as chips in filter panel and tag editor
- `type: combobox` → group renders as autocomplete input in filter panel and tag editor
- Group-level `color` applied to all its chips (hex `#0055A4` and CSS name `blue` both accepted)
- Tag-level `color` overrides group color
- Group-level `description` shown in tooltip on info icon (filter panel + tag editor)
- Tag-level `description` shown in tooltip on info icon
- Invalid YAML → save surfaces parse error, no DB change, editor stays open
- YAML missing required `name` → save rejected with clear error
- Duplicate `id` in YAML → save rejected with clear error
- Reorder groups in YAML → order respected in filter bar and tag editor
- "YAML syntax reference" expansion panel expands/collapses
- Save button shows loading state, success notification on completion, editor stays in sync after reload
- Preview widget reflects the *saved* tag state (not unsaved edits)
- Photo quality settings
- Export/Import
- Gallery page size fields (GALLERY_PAGE_SIZE_DESKTOP / GALLERY_PAGE_SIZE_MOBILE) visible and saveable in Photo quality tab
- Configurable grid sizes (GRID_SIZE_XS / S / M / L / XL) editable in admin, persisted in `AppConfig`, applied on next navigation
- Configurable display photo (fullscreen viewer) sample size editable in admin and applied on next photo open
- `sharedDatas.js` falls back to defaults when `appConfig` store has not loaded yet (no crash on cold start)
- KEEP_ORIGINAL_VIDEO toggle visible in Video tab with disk warning alert
- KEEP_ORIGINAL_VIDEO=true: worker renames source file to `_original.<ext>` after transcoding
- KEEP_ORIGINAL_VIDEO=true: ZIP download serves `_original.<ext>` when raw size is requested
- KEEP_ORIGINAL_VIDEO=true: export/import preserves `_original` file alongside poster
- TRANSCODE_TIMEOUT field visible and saveable in Video tab
- TRANSCODE_POLL_INTERVAL field visible and saveable in Video tab
- TRANSCODE_THREADS field visible and saveable (0 = auto)
- TRANSCODE_PRESET select shows all 9 ffmpeg presets (ultrafast → veryslow), saveable
- TRANSCODE_CRF field visible and saveable (range 0–51 hint)
- KEEP_ORIGINAL_VIDEO warning alert appears only when toggle is on, disappears when off
- Worker status refresh icon reloads status block without a page reload
- Worker status chip color/icon reflects state (online / offline / encoding / idle)
- Video transcode stats table shows pending / processing / error counts from API
- "Retry" inline button visible only when `error > 0` in stats table
- Save settings invalidates appConfig store cache (new limit applied immediately on next navigation)
- Worker healthcheck: worker container waits for web healthcheck before starting

**Video**
- Upload an MP4 file when `ALLOW_VIDEO_UPLOAD=true` → appears in Unpublished with spinner overlay
- Upload a MOV file → accepted, transcoded to MP4, appears with correct duration/poster
- Upload a WebM file → accepted, transcoded to MP4
- Upload an unsupported extension (e.g. `.avi`, `.mkv`) → rejected with a clear error notification
- Upload rejected when `ALLOW_VIDEO_UPLOAD=false`
- Upload a single batch mixing photos and videos — each handled independently, photos appear immediately, videos go through transcode pipeline
- Duplicate video upload (same MD5) → "Picture already exist" response (same dedup path as photos)
- Video poster (`.jpg`) extracted at upload time → thumbnail visible **before** transcode finishes
- Spinner / "processing" overlay rendered on video tile while `transcode_status` is `pending` or `processing`
- Transcode failure → `transcode_status=error`, error overlay visible on tile, count increments in admin Video tab
- Video tagged → tag filter on Photos and on Views surfaces the video
- Bulk publish on Unpublished includes selected videos
- Bulk delete on Photos / Unpublished / ViewDetail removes both `.mp4` and poster `.jpg` from disk
- Worker transcodes video → `transcode_status` becomes `done`, play icon overlay appears in grid
- Duration badge visible on video thumbnail in grid
- Click on video in grid → `<video>` player renders in DisplayPhoto carousel
- Video playback controls visible and functional
- Media type filter (All / Photos / Videos) in Photos page filters correctly
- Media type filter in ViewDetail filters correctly
- `filter_media_type` persisted on View: creating a "videos only" view works
- Retry errors button in admin Video tab resets `error` → `pending`
- Worker stuck-processing recovery: videos stuck in `processing` on startup are reset to `pending`
- Worker heartbeat: `WORKER_LAST_SEEN` updated every ~30s during long transcodes (status chip stays "encoding")
- Worker status chip shows online/offline/encoding state correctly
- `origin_filename` displayed in worker status UI for the video currently being transcoded
- Flush samples → video thumbnails regenerate lazily from poster JPG in raw/
- Export with raw: .mp4 + poster .jpg exported to dump folder
- Import: .mp4 file ingested, poster restored, `transcode_status=pending` if no poster
- ZIP download: videos included as .mp4 regardless of size param
- Delete video: .mp4 + poster .jpg removed from raw/
- TRANSCODE_PRESET / TRANSCODE_CRF actually applied — encoded file size/quality differs between e.g. `ultrafast`+CRF18 and `veryslow`+CRF28
- TRANSCODE_THREADS applied — ffmpeg invocation respects the configured thread count
- TRANSCODE_TIMEOUT enforced — a transcode that exceeds the timeout is killed and marked `error`
- TRANSCODE_POLL_INTERVAL respected — worker idles between polls at the configured cadence
- Video upload through an **upload link** when ALLOW_VIDEO_UPLOAD=true → video accepted and queued for transcode
- Video upload through an upload link when ALLOW_VIDEO_UPLOAD=false → rejected with the same error as authenticated upload
- KEEP_ORIGINAL_VIDEO toggle change does not retroactively affect already-uploaded videos
- RAW_PHOTO_OVERRIDE_EXISTS resets `original_ext` field for videos on re-upload

**Navigation**
- Middle-click / right-click → "Open in new tab" on photo cards, view cards, and gallery items
- Favicon and app icon render correctly in browser tab and bookmarks

**Backend / install**
- Initial migration creates Django auth groups `member` and `contributor` (regression — lost during the migration squash, now restored in 0001_initial)
- List endpoints (`/api/photos`, `/api/unpublished`, `/api/views/:id`) prefetch `tags` + `tag_group` — single query, not N+1 (would need a query-count assertion)
- `PHOTO_LIST_FIELDS` constant — video-only fields are stripped from photo entries in non-video contexts
- API responses are gzip-compressed by nginx (response header check)

**Unpublished**
- "Tag" bulk action (TagPhotos component flow)
- Tag filter bar visible on Unpublished — filtering the queue by tag updates the grid and counter
- Sort options on Unpublished mirror Photos (Mixed / Random / Origin filename) and default to ascending
