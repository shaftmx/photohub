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

Place two small JPEG test photos in `tests/fixtures/`:
- `test-photo.jpg`
- `test-photo-2.jpg`

Any valid JPEG works (even 1×1 px). They are used for upload tests.

---

## Output

- **Terminal:** pass/fail per test with timing
- **HTML report:** `playwright-report/index.html` — traces, screenshots on failure, video optional

---

## Structure

```
tests/
  e2e/
    helpers.ts              — shared auth, navigation, grid helpers
    auth.spec.ts            — login / logout / redirect
    home.spec.ts            — home gallery, public access, AppBar menu, logo
    upload-publish.spec.ts  — upload JPEG, unpublished queue, publish, delete
    photos.spec.ts          — grid, filters, sort, selection mode, detail panel
    views.spec.ts           — create, list, detail, edit, delete, share link, custom order
  fixtures/
    test-photo.jpg          — (add manually, any valid JPEG)
    test-photo-2.jpg        — (add manually, any valid JPEG)
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
