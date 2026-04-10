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
  -v $(pwd)/playwright-report:/tests/playwright-report \
  photohub-e2e e2e/views.spec.ts
```

### Run with a specific test name (grep)

```bash
docker run --rm \
  -e BASE_URL=http://172.17.0.1:8080 \
  -v $(pwd)/playwright-report:/tests/playwright-report \
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

## Structure

```
tests/
  e2e/
    helpers.ts            — shared auth, navigation, grid helpers
    auth.spec.ts          — login / logout / redirect
    upload-publish.spec.ts — upload JPEG, unpublished list, publish, delete
    photos.spec.ts        — grid display, filters, sort, selection mode, detail panel
    views.spec.ts         — create, list, detail, edit, delete views
  fixtures/
    test-photo.jpg        — (add manually)
    test-photo-2.jpg      — (add manually)
  playwright.config.ts
  package.json
```

## Notes

- Tests run **sequentially** (not parallel) since they share a database.
- `views.spec.ts` uses `beforeAll`/`afterAll` to create/delete test views around each describe block.
- Upload tests assume the app is running and the DB is accessible.
