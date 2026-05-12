import { Page, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

// ---
// Credentials — override via env vars in CI
// ---
export const TEST_USER = process.env.TEST_USER || 'admin'
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin'

// Small fixture JPEG placed in tests/fixtures/
export const FIXTURE_PHOTO = path.join(__dirname, '../fixtures/test-photo.jpg')
export const FIXTURE_PHOTO_2 = path.join(__dirname, '../fixtures/test-photo-2.jpg')

// Video fixtures — generated once with ffmpeg, see tests/README.md
export const FIXTURE_VIDEO_MP4 = path.join(__dirname, '../fixtures/test-video.mp4')
export const FIXTURE_VIDEO_MOV = path.join(__dirname, '../fixtures/test-video.mov')
export const FIXTURE_VIDEO_WEBM = path.join(__dirname, '../fixtures/test-video.webm')
export const FIXTURE_UNSUPPORTED = path.join(__dirname, '../fixtures/test-unsupported.avi')

/**
 * Copy a fixture JPEG to a temp file with a random suffix appended to the JPEG
 * comment marker so the MD5 differs from the original. Returns the temp path.
 * Call this when you need a file that won't be rejected as a duplicate.
 */
export function uniquePhoto(base = FIXTURE_PHOTO): string {
  const src = fs.readFileSync(base)
  // Append a random comment to change the file's MD5 without breaking JPEG structure
  const suffix = Buffer.from(`\xff\xfe` + Math.random().toString(36))
  const unique = Buffer.concat([src, suffix])
  const dest = path.join(os.tmpdir(), `photohub-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)
  fs.writeFileSync(dest, unique)
  return dest
}

/**
 * Copy any binary fixture to a temp file with random bytes appended so the MD5
 * differs from the source. Works for video files (mp4, mov, webm) the same way.
 */
export function uniqueFile(base: string): string {
  const src = fs.readFileSync(base)
  const suffix = Buffer.from(Math.random().toString(36))
  const unique = Buffer.concat([src, suffix])
  const ext = path.extname(base)
  const dest = path.join(os.tmpdir(), `photohub-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  fs.writeFileSync(dest, unique)
  return dest
}

/**
 * Write a temp file with the exact filename requested (placed in a unique
 * sub-directory to avoid collisions). The backend's is_system_file() check
 * is case-insensitive on the *full* filename, so the basename must match
 * exactly (".DS_Store", "Thumbs.db", etc.).
 */
export function tempFile(name: string, content: Buffer | string = ''): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'photohub-test-'))
  const dest = path.join(dir, name)
  fs.writeFileSync(dest, content)
  return dest
}

// ---
// Auth helpers
// ---

/** Log in via the login form and wait for navigation to complete. */
export async function loginAs(page: Page, username = TEST_USER, password = TEST_PASSWORD) {
  await page.goto('/login')
  // Ensure the CSRF cookie is set before we POST — otherwise Django rejects
  // the form silently and the SPA stays on /login.
  await page.request.get('/api/get_csrf')
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  // After login we end up on Home — give the SPA generous time to redirect.
  await expect(page).toHaveURL(/\/$|\/home|#\/$/, { timeout: 15_000 })
}

/** Log out via the navigation menu. */
export async function logout(page: Page) {
  await openNavMenu(page)
  await page.locator('.v-list-item').filter({ hasText: 'Logout' }).click()
  await expect(page).toHaveURL(/login/)
}

// ---
// Navigation helpers
// ---

/** Open the AppBar hamburger navigation menu. */
export async function openNavMenu(page: Page) {
  await page.locator('.v-app-bar-nav-icon').click()
}

/** Navigate to a named section via the AppBar menu. */
export async function navigateTo(page: Page, section: 'Photos' | 'Upload' | 'Unpublished' | 'Views' | 'Home') {
  await openNavMenu(page)
  await page.locator('.v-list-item').filter({ hasText: section }).first().click()
  await page.waitForLoadState('networkidle')
}

// ---
// Grid helpers
// ---

/** Return all photo grid items currently visible. */
export function gridItems(page: Page) {
  return page.locator('.item .item-inner img')
}

/** Wait for the photo grid to be non-empty. */
export async function waitForGrid(page: Page) {
  await expect(page.locator('.item').first()).toBeVisible({ timeout: 10_000 })
}

// ---
// API helpers — use the page's cookie jar (session + csrftoken) so calls are
// authenticated as the currently logged-in user. Always call loginAs() first.
// ---

async function csrfToken(page: Page): Promise<string | null> {
  // In dev mode (DEBUG=true) the Django CSRF middleware is disabled and no
  // csrftoken cookie is ever set — apiPost still works without the header.
  let cookies = await page.context().cookies()
  let cookie = cookies.find(c => c.name === 'csrftoken')
  if (!cookie) {
    await page.request.get('/api/get_csrf').catch(() => null)
    cookies = await page.context().cookies()
    cookie = cookies.find(c => c.name === 'csrftoken')
  }
  return cookie ? cookie.value : null
}

/** Authenticated GET against the API. Returns the parsed JSON body. */
export async function apiGet(page: Page, path: string): Promise<any> {
  const res = await page.request.get(path)
  return res.json()
}

/** Authenticated POST. Adds X-CSRFToken when the cookie is present (prod);
 *  in dev (DEBUG=true) the CSRF middleware is disabled and the header is
 *  unnecessary. */
export async function apiPost(page: Page, path: string, body: any = {}): Promise<any> {
  const token = await csrfToken(page)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['X-CSRFToken'] = token
  const res = await page.request.post(path, { headers, data: JSON.stringify(body) })
  return res.json()
}

// ---
// Admin helpers
// ---

export type AdminTab = 'users' | 'tags' | 'quality' | 'video' | 'backup'

/** Navigate to /admin and switch to a specific tab. */
export async function gotoAdminTab(page: Page, tab: AdminTab) {
  await page.goto(`/admin?tab=${tab}`)
  await page.waitForLoadState('networkidle')
}

/**
 * Replace the full tag YAML via the admin API (much faster and more reliable
 * than driving the CodeMirror editor through the DOM). Returns the API result.
 */
export async function setTagsYaml(page: Page, yaml: string): Promise<any> {
  return apiPost(page, '/api/admin/tags', { yaml })
}

/** Fetch the current YAML view of all tag groups + tags. */
export async function getTagsYaml(page: Page): Promise<string> {
  const res = await apiGet(page, '/api/admin/tags')
  return res?.data?.yaml || ''
}

/** Set one or more AppConfig keys via the admin API. */
export async function setAppConfig(page: Page, values: Record<string, any>): Promise<any> {
  return apiPost(page, '/api/admin/config', values)
}

/**
 * Apply tags to a single photo via /api/apply_tags. `tags` is a mapping of
 * group-name -> [tag-name]. Replaces all current tags on the photo with the
 * provided set (the endpoint diffs against `current_common_tags`).
 */
export async function applyTagsToPhoto(
  page: Page,
  filename: string,
  tags: Record<string, string[]>,
): Promise<any> {
  return apiPost(page, '/api/apply_tags', {
    common_photos_filename: [filename],
    current_common_tags: {},
    staging_common_tags: tags,
  })
}

// ---
// Upload helpers
// ---

/** Upload one or more files via the Upload page: set the input then click
 *  the Upload submit button (the form does not auto-submit). Assumes the
 *  page is already on /upload. */
export async function uploadFiles(page: Page, paths: string | string[]) {
  await page.getByLabel('File input', { exact: true }).setInputFiles(paths)
  await page.getByRole('button', { name: 'Upload', exact: true }).click()
}

// ---
// Video helpers
// ---

/**
 * Poll the API until the named photo/video's transcode_status reaches `done`
 * (or `error`, which we surface as a failure). Default timeout 60s.
 */
export async function waitForTranscode(page: Page, filenameSubstr: string, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await apiGet(page, '/api/unpublished')
    const photo = (res?.data?.photos || []).find(
      (p: any) => p.origin_filename?.includes(filenameSubstr) || p.filename?.includes(filenameSubstr)
    )
    if (photo) {
      if (photo.transcode_status === 'done') return photo
      if (photo.transcode_status === 'error') throw new Error(`Transcode failed for ${filenameSubstr}`)
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`Timed out waiting for transcode of ${filenameSubstr}`)
}
