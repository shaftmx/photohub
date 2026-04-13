# PhotoHub — E2E Tests (Playwright)

## Run with Docker (recommended — no Node needed)

Place two JPEG test photos in `tests/fixtures/` first (see below), then:

```bash
cd tests

# Build the image once — only Node + Playwright, no test sources
docker build -t photohub-e2e .

# Run from the tests/ directory — tests are mounted live, no rebuild needed
docker run --rm \
  -e BASE_URL=http://172.17.0.1:8080 \
  -e TEST_USER=admin \
  -e TEST_PASSWORD=admin \
  -v $(pwd):/tests \
  -v /tests/node_modules \
  photohub-e2e
```

The HTML report is written to `tests/playwright-report/` on your host.
Open `playwright-report/index.html` in a browser to browse results.

> **Linux note:** `host.docker.internal` may not resolve on Linux.
> Use your host IP instead: `BASE_URL=http://172.17.0.1:8080`
> Or add `--network host` and use `BASE_URL=http://localhost:8080`.

### Run a single spec file

```bash
docker run --rm \
  -e BASE_URL=http://172.17.0.1:8080 \
  -e TEST_USER=admin \
  -e TEST_PASSWORD=admin \
  -v $(pwd):/tests \
  -v /tests/node_modules \
  photohub-e2e e2e/views.spec.ts
```

### Run with a specific test name (grep)

```bash
docker run --rm \
  -e BASE_URL=http://172.17.0.1:8080 \
  -e TEST_USER=admin \
  -e TEST_PASSWORD=admin \
  -v $(pwd):/tests \
  -v /tests/node_modules \
  photohub-e2e --grep "create a view"
```

---

## Run locally (requires Node)

```bash
cd tests
npm install
npx playwright install chromium
npm test
```

## Required fixtures

Place two small JPEG test photos in `tests/fixtures/`:
- `test-photo.jpg`
- `test-photo-2.jpg`

Any valid JPEG works (even 1x1px). They are used for upload tests.

## Output

- **Terminal:** pass/fail per test with timing
- **HTML report:** `playwright-report/index.html` — full trace, screenshots on failure, video optional

---

## What is tested (126 tests)

### Home — authenticated (`home.spec.ts` — 4 tests)
- Gallery grid is visible when views exist
- Gallery card shows name overlay
- Clicking a gallery card navigates to view detail
- Empty state shows "Create your first view" when no views exist

### Home — unauthenticated (`home.spec.ts` — 3 tests)
- Home page loads without login (no redirect)
- No "New view" button visible when not logged in
- Public views are visible without authentication

### AppBar — logo (`home.spec.ts` — 1 test)
- Logo click navigates to home from another page

### AppBar — unauthenticated menu (`home.spec.ts` — 3 tests)
- Menu shows Login item when not logged in
- Menu hides auth-only items (Upload, Photos, Logout) when not logged in
- Login item in menu navigates to login page

### AppBar — authenticated menu (`home.spec.ts` — 5 tests)
- Menu shows username when logged in
- Menu shows all auth items (Photos, Views, Upload, Logout)
- Menu does not show Login item when logged in
- Dark theme toggle is visible in menu

### Authentication (`auth.spec.ts` — 4 tests)
- Unauthenticated access to `/photos` redirects to `/login`
- Login with valid credentials succeeds and lands outside `/login`
- Login with invalid credentials stays on `/login` (error shown)
- Logout via nav menu redirects to `/login`

### Upload (`upload-publish.spec.ts` — 3 tests)
- Upload page loads, heading visible, Upload button disabled before file selection
- Upload a single JPEG: success alert appears, filename visible in result list
- Quick-navigate to Unpublished via icon button after upload
- Upload multiple files at once: all succeed

### Unpublished queue (`upload-publish.spec.ts` — 6 tests)
- Page shows heading and subtitle
- Select all → Deselect all (counter resets)
- Open photo detail panel from the hover Details button (drawer opens)
- Select one photo and publish it (count decreases by 1)
- Delete one unpublished photo (count decreases by 1)
- Select all and publish all (queue empties to 0)

### Photos — grid & display (`photos.spec.ts` — 6 tests)
- Published photos appear in a grid
- Clicking a photo opens the fullscreen dialog (`?displayPhoto=` in URL)
- Close button in the dialog toolbar returns to the grid
- Favorite button appears on photo hover (`.favorite-btn`)
- Favorite toggle on hover: click toggles state, reverts correctly
- Grid size slider: adjusting it keeps the grid rendered

### Photos — sort (`photos.spec.ts` — 3 tests)
- Sort by Photo date
- Sort by Upload date
- Toggle sort direction (asc ↔ desc)

### Photos — filters (`photos.spec.ts` — 18 tests)
- Quick filter mode is active by default
- Switch to No filter mode (show all photos) — URL gets `filter_mode=none`
- Switch to Detailed filter mode (expand panel appears)
- Switch to No tags filter mode (grid updates)
- Filter by favorite — URL updates with `favorite=true`
- Filter by rating — URL updates with `rating=N`
- Rating mode toggle cycles between ≤ and = operators
- Sort change updates URL with `sort_by=...`
- URL params restore favorite filter on reload (`text-red` class active)
- URL params restore rating filter on reload (star amber)
- URL params restore sort on reload (select shows correct option)
- URL params restore no-tags filter mode on reload (button active)
- "Save as view" button is visible in the filter bar
- "Save as view" navigates to `/views/create` with filter state pre-filled

### Photos — selection mode (`photos.spec.ts` — 7 tests)
- Enter selection mode (Select button) and cancel back
- Click one photo → counter shows "1 selected"
- Select all → counter shows total count
- Select all then deselect all → counter resets
- Bulk unpublish: confirm dialog appears, cancel aborts
- Bulk delete: confirm dialog appears, cancel aborts
- Bulk "Add to favorites": action runs, selection mode exits

### Photo detail panel (`photos.spec.ts` — 6 tests)
- Detail panel opens inside the fullscreen dialog (Details button)
- Favorite toggle in detail panel: click + revert
- Rating: set 4 stars, revert to 0
- EXIF and Metadata sections are visible in the detail panel
- Edit description: fill, blur to save, revert
- Unpublish from detail panel: confirm dialog → API 200 → dialog closes
- Navigate to next photo with carousel arrow (if available)

### Views — list (`views.spec.ts` — 5 tests)
- Page shows heading and "New view" button
- Empty state: "Create your first view" CTA appears when no views exist
- View card shows name, photo count and Public/Private badge
- View card hover reveals edit/delete buttons (`.card-actions`)
- "New view" button navigates to `/views/create`

### Views — create (`views.spec.ts` — 11 tests)
- Save button is disabled when name is empty
- Cancel navigates back to the views list
- Create a view with only a name → redirects to view detail
- Create a view with description, public toggle and sort → saves correctly
- Create a view with No filter mode → saves correctly
- Create a view with No tags filter mode → saves correctly
- Create a view with favorite filter active → saves correctly
- Create a view with rating filter → filter chip visible in detail
- Preview grid photo count updates when filter mode changes
- Preview grid respects sort selection
- "Save as view" from Photos page pre-fills filter state in the form

### Views — custom order (`views.spec.ts` — 5 tests)
- "Custom order" button is visible in edit view sort bar (State A)
- Clicking "Custom order" enters drag mode (drag handles visible)
- "Done" exits drag mode and "Reorder" button appears (State B)
- Deleting custom order reverts to normal sort (State A restored)
- "Custom order" option is available in sort controls in view detail

### Views — detail (`views.spec.ts` — 10 tests)
- View detail shows name, photo count, Public/Private badge
- Filter chips toggle button shows/hides active filter chips
- Description toggle button shows/hides the markdown description
- Sort controls are visible
- Grid size slider is visible
- Clicking a photo opens the fullscreen dialog
- Favorite button appears on photo hover (same as Photos page)
- Edit button navigates to `/views/:id/edit`
- Delete button opens confirm dialog, cancel aborts
- Back button (← arrow) navigates to the views list

### Views — public access (`views.spec.ts` — 3 tests)
- Public view is accessible without authentication
- Private view redirects to login when accessed without authentication
- Non-existent view ID shows "View not found" error message

### Views — share link (`views.spec.ts` — 7 tests)
- Share button is visible for private views (authenticated)
- Generate a share link: URL field appears with a copyable link
- Copy button copies the URL and shows a checkmark
- Share link URL navigates to a read-only view (no edit/delete buttons)
- Read-only view: photo detail panel hides edit actions
- Regenerate share link: new URL replaces the old one
- Revoke share link: URL field disappears, share icon outline restored

### Views — edit (`views.spec.ts` — 6 tests)
- Edit page pre-fills name from the existing view
- Edit page pre-fills filter mode (Quick active by default)
- Cancel navigates back to view detail
- Edit name and save: API returns 200, view detail shows new name
- Edit sort and save: sort setting persists on reload of edit page
- Changing sort in edit page updates the preview photo count

### Views — delete from list (`views.spec.ts` — 1 test)
- Create a view, go to list, hover card, click delete, confirm → card disappears

---

## What is NOT tested

### Features not yet covered by E2E tests

**Photos**
- Tag filtering with the Quick autocomplete (selecting specific tags)
- Tag filtering with the Detailed panel (TagFilter component)
- URL restore for `filter_mode=detail` on reload
- "Remove from favorites" bulk action
- "Delete" bulk action actually deleting (only confirm dialog tested)
- "Tag" bulk action opening the tag editor
- Editing tags from the detail panel (EditTagsDialog)
- GPS "Open in Google Maps" button in Metadata section (requires photo with GPS EXIF data)

**Upload**
- Duplicate file upload (same MD5 → "Picture already exist" response)
- Non-JPEG file rejection (the backend only handles JPEG)
- Large file or network error handling

**Views**
- Custom order: actual drag & drop reorder (HTML5 drag events hard to simulate reliably)
- Custom order: save persists and is restored on reload
- Tag filter in views (creating a view with specific tags, verifying filter is applied)

**Tags management**
- Tags UI (not yet built — currently YAML only)

**Admin / Setup**
- Admin page (not yet built as accessible at runtime)

**Export / Import**
- ZIP download — not yet built
- Export/Import endpoints — not E2E tested

---

## Structure

```
tests/
  e2e/
    helpers.ts            — shared auth, navigation, grid helpers
    auth.spec.ts          — login / logout / redirect
    home.spec.ts          — home gallery, public access, AppBar menu, logo
    upload-publish.spec.ts — upload JPEG, unpublished list, publish, delete
    photos.spec.ts        — grid display, filters, sort, selection mode, detail panel
    views.spec.ts         — create, list, detail, edit, delete views
  fixtures/
    test-photo.jpg        — (add manually, any valid JPEG)
    test-photo-2.jpg      — (add manually, any valid JPEG)
  playwright.config.ts
  package.json
```

## Notes

- Tests run **sequentially** (not parallel) since they share a database.
- `views.spec.ts` uses `beforeAll`/`afterAll` to create/delete test views around each describe block.
- Upload tests assume the app is running and the DB is accessible.
- The Docker container exits automatically after tests complete (reporter configured with `open: 'never'`).
