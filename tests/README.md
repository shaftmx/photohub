# PhotoHub — E2E Tests (Playwright)

## Run with Docker (recommended — no Node needed)

Place two JPEG test photos in `tests/fixtures/` first (see [Required fixtures](#required-fixtures)), then:

```bash
cd tests

# Build the image once — only Node + Playwright, no test sources
docker build -t photohub-e2e .

# Run all tests — test files are mounted live, no rebuild needed
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
> Use your host IP: `BASE_URL=http://172.17.0.1:8080`
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

### Run with a name filter (grep)

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

---

## Required fixtures

### Photos
Place two small JPEG test photos in `tests/fixtures/`:
- `test-photo.jpg`
- `test-photo-2.jpg`

Any valid JPEG works (even 1×1 px). They are used for upload tests.

### Videos
The video fixtures are committed to the repo (tiny, ~2–7 KB each):
- `test-video.mp4` — H.264 64×64 1s (used by most video tests)
- `test-video.mov` — H.264 in MOV container
- `test-video.webm` — VP9 / WebM
- `test-unsupported.avi` — MPEG-4 in AVI container (used to verify rejection)

To regenerate them with `ffmpeg`:
```bash
cd tests/fixtures
ffmpeg -y -f lavfi -i "color=c=blue:s=64x64:d=1:r=10"   -c:v libx264 -pix_fmt yuv420p -movflags +faststart test-video.mp4
ffmpeg -y -f lavfi -i "color=c=green:s=64x64:d=1:r=10"  -c:v libx264 -pix_fmt yuv420p test-video.mov
ffmpeg -y -f lavfi -i "color=c=red:s=64x64:d=1:r=10"    -c:v libvpx-vp9 -b:v 50k test-video.webm
ffmpeg -y -f lavfi -i "color=c=yellow:s=64x64:d=1:r=10" -c:v mpeg4    test-unsupported.avi
```

---

## Output

- **Terminal:** pass/fail per test with timing
- **HTML report:** `playwright-report/index.html` — traces, screenshots on failure, video optional

---

## Structure

```
tests/
  e2e/
    helpers.ts              — shared auth, navigation, grid, API, admin, upload, video helpers
    auth.spec.ts            — login / logout / redirect
    home.spec.ts            — home gallery, public access, AppBar menu, logo
    upload-publish.spec.ts  — upload JPEG, unpublished queue, publish, delete
    photos.spec.ts          — grid, filters, sort, selection mode, detail panel
    views.spec.ts           — create, list, detail, edit, delete, share link, custom order
    admin.spec.ts           — admin tabs, Tags YAML editor, photo quality, video settings, backup
    video.spec.ts           — video upload / transcode / playback / media-type filter
  fixtures/
    test-photo.jpg          — (add manually, any valid JPEG)
    test-photo-2.jpg        — (add manually, any valid JPEG)
    test-video.mp4          — H.264 / 64×64 / 1s
    test-video.mov          — H.264 / MOV container
    test-video.webm         — VP9 / WebM
    test-unsupported.avi    — MPEG-4 / AVI (rejection test)
  COVERAGE.md               — full list of what is and isn't tested
  playwright.config.ts
  package.json
```

---

## Notes

- Tests run **sequentially** (not parallel) to avoid database conflicts.
- `views.spec.ts` uses `beforeAll`/`afterAll` to create/delete test views around each describe block.
- Upload tests assume the app is running with an accessible database.
- The Docker container exits automatically after tests complete.

---

See [COVERAGE.md](COVERAGE.md) for the full breakdown of what is tested and what is not.
