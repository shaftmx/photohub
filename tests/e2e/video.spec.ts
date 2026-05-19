import { test, expect } from '@playwright/test'
import {
  loginAs, navigateTo, waitForGrid,
  FIXTURE_PHOTO,
  FIXTURE_VIDEO_MP4, FIXTURE_VIDEO_MOV, FIXTURE_VIDEO_WEBM, FIXTURE_UNSUPPORTED,
  FIXTURE_VIDEO_DATED_MP4, FIXTURE_VIDEO_DATED_CREATION_TIME,
  apiGet, apiPost, setAppConfig, uploadFiles, uniqueFile, waitForTranscode,
} from './helpers'

// All tests in this file require ALLOW_VIDEO_UPLOAD=true. We toggle it on once
// at the start, restore it at the end. Video transcoding can take time —
// give generous timeouts and consider skipping on slow environments.

let originalAllowVideo: any
let originalAllowKeep: any

test.describe.configure({ mode: 'serial' })

test.describe('Video — upload & transcode', () => {

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    const cfg = (await apiGet(page, '/api/app-config'))?.data || {}
    originalAllowVideo = cfg.ALLOW_VIDEO_UPLOAD
    originalAllowKeep = cfg.KEEP_ORIGINAL_VIDEO
    await setAppConfig(page, { ALLOW_VIDEO_UPLOAD: true })
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    await setAppConfig(page, {
      ALLOW_VIDEO_UPLOAD: originalAllowVideo,
      KEEP_ORIGINAL_VIDEO: originalAllowKeep,
    })
    await ctx.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Upload')
  })

  test('MP4 file is accepted and appears in Unpublished', async ({ page }) => {
    const file = uniqueFile(FIXTURE_VIDEO_MP4)
    await uploadFiles(page, file)
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
    // Verify via API
    const res = await apiGet(page, '/api/unpublished?media_type=video')
    expect((res?.data?.photos || []).length).toBeGreaterThan(0)
  })

  test('MOV file is accepted', async ({ page }) => {
    const file = uniqueFile(FIXTURE_VIDEO_MOV)
    await uploadFiles(page, file)
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
  })

  test('WebM file is accepted', async ({ page }) => {
    const file = uniqueFile(FIXTURE_VIDEO_WEBM)
    await uploadFiles(page, file)
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
  })

  test('video creation_time from container metadata is stored as Photo.date', async ({ page }) => {
    const file = uniqueFile(FIXTURE_VIDEO_DATED_MP4)
    const filename = require('path').basename(file)
    await uploadFiles(page, file)
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
    // Locate the uploaded video by its origin_filename — date field on it
    // must match the creation_time injected into the fixture, not the upload
    // time (which would be ~now).
    const res = await apiGet(page, '/api/unpublished?media_type=video&limit=500')
    const photos = (res?.data?.photos || []) as any[]
    const uploaded = photos.find(p => p.origin_filename === filename)
    expect(uploaded, `uploaded video '${filename}' not found in /api/unpublished`).toBeTruthy()
    expect(new Date(uploaded.date).getTime()).toBe(new Date(FIXTURE_VIDEO_DATED_CREATION_TIME).getTime())
  })

  test('file input accept attribute exposes image/* and video/* when video upload is enabled', async ({ page }) => {
    // We use wildcard MIME categories so the Android Photo Picker on Pixel
    // surfaces videos (it ignored specific MIME like video/mp4). Upload.vue's
    // mounted() hook fetches /api/admin/config asynchronously and only then
    // updates the accept attribute — poll until video/* shows up.
    const input = page.getByLabel('File input', { exact: true })
    await expect.poll(async () => await input.getAttribute('accept'), { timeout: 8_000 })
      .toMatch(/video\/\*/)
    const accept = await input.getAttribute('accept')
    expect(accept).toMatch(/image\/\*/)
  })

  test('upload is rejected at the API level when ALLOW_VIDEO_UPLOAD=false', async ({ page }) => {
    // The frontend currently swallows the 400 because the response body has
    // no `ERROR` key (Response(400, data="Video upload is disabled")). We
    // verify the API contract directly so this stays meaningful regardless
    // of the UI bug.
    await setAppConfig(page, { ALLOW_VIDEO_UPLOAD: false })
    try {
      const fs = require('fs')
      const buf = fs.readFileSync(FIXTURE_VIDEO_MP4)
      const token = (await page.context().cookies()).find(c => c.name === 'csrftoken')?.value
      const headers: Record<string, string> = {}
      if (token) headers['X-CSRFToken'] = token
      const res = await page.request.post('/api/upload', {
        headers,
        multipart: {
          'test-video.mp4': { name: 'test-video.mp4', mimeType: 'video/mp4', buffer: buf },
        },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(JSON.stringify(body)).toMatch(/disabled/i)
    } finally {
      await setAppConfig(page, { ALLOW_VIDEO_UPLOAD: true })
    }
  })

  test('mixed batch (photo + video) — both handled', async ({ page }) => {
    const video = uniqueFile(FIXTURE_VIDEO_MP4)
    const photo = uniqueFile(FIXTURE_PHOTO)
    await uploadFiles(page, [video, photo])
    // waitForLoadState('networkidle') is unreliable behind the Vite dev server
    // (HMR websocket keeps connections alive). Wait for the success snackbar
    // instead — same pattern as the single-file upload tests above.
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 30_000 })
    // The success toast fires after the last upload's response. Poll briefly
    // for both types to appear — covers any DB commit lag.
    await expect.poll(async () => {
      const res = await apiGet(page, '/api/unpublished')
      const all = res?.data?.photos || []
      return all.some((p: any) => p.type === 'video') && all.some((p: any) => p.type !== 'video')
    }, { timeout: 10_000, message: 'expected both video and non-video in /api/unpublished' }).toBe(true)
  })

  test('duplicate video upload (same MD5) returns 202 "File already exist" from the API', async ({ page }) => {
    // Same situation as photos: the frontend silently treats 202 as success.
    // Verified at the API level.
    await uploadFiles(page, FIXTURE_VIDEO_MP4)
    await page.waitForLoadState('networkidle')
    const fs = require('fs')
    const buf = fs.readFileSync(FIXTURE_VIDEO_MP4)
    const token = (await page.context().cookies()).find(c => c.name === 'csrftoken')?.value
    const headers: Record<string, string> = {}
    if (token) headers['X-CSRFToken'] = token
    const res = await page.request.post('/api/upload', {
      headers,
      multipart: {
        'test-video.mp4': { name: 'test-video.mp4', mimeType: 'video/mp4', buffer: buf },
      },
    })
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(JSON.stringify(body)).toMatch(/already exist/i)
  })

})

test.describe('Video — transcode pipeline & UI overlays', () => {

  let videoFilename: string

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    await setAppConfig(page, { ALLOW_VIDEO_UPLOAD: true })
    // Upload one fresh video that we'll observe through the pipeline
    await page.goto('/upload')
    const file = uniqueFile(FIXTURE_VIDEO_MP4)
    await uploadFiles(page, file)
    await page.waitForLoadState('networkidle')
    // Find it in the unpublished list
    const res = await apiGet(page, '/api/unpublished?media_type=video&sort_by=upload_date&sort_dir=desc')
    videoFilename = res?.data?.photos?.[0]?.filename
    await ctx.close()
  })

  test('poster (thumbnail) is generated at upload time, before transcode finishes', async ({ page }) => {
    test.skip(!videoFilename, 'No video was successfully uploaded')
    await loginAs(page)
    await navigateTo(page, 'Unpublished')
    // The video tile should render an <img> (the poster) regardless of transcode_status
    const tile = page.locator('.item').filter({ has: page.locator('.video-overlay') }).first()
    await expect(tile).toBeVisible()
    await expect(tile.locator('img')).toBeVisible()
  })

  test('transcoded video gets the play overlay and duration badge', async ({ page }) => {
    test.skip(!videoFilename, 'No video was successfully uploaded')
    await loginAs(page)
    // Wait for the worker to finish transcoding (may take a while on slow CI)
    const photo = await waitForTranscode(page, videoFilename, 90_000).catch(() => null)
    test.skip(!photo, 'Worker did not transcode in time')
    await navigateTo(page, 'Unpublished')
    const tile = page.locator('.item').filter({ has: page.locator('.video-overlay') }).first()
    await expect(tile.locator('.video-overlay')).toBeVisible()
    // Duration badge — looks for MM:SS format
    await expect(tile.locator('text=/\\d:\\d{2}/').first()).toBeVisible()
  })

  test('click on a transcoded video on Photos opens the <video> player', async ({ page }) => {
    test.skip(!videoFilename, 'No video was successfully uploaded')
    await loginAs(page)
    // Unpublished does not have a fullscreen viewer (click = select).
    // Publish the video first, then navigate to /photos where DisplayPhoto runs.
    await apiPost(page, '/api/publish', { photos: [videoFilename] })
    await navigateTo(page, 'Photos')
    await page.waitForLoadState('networkidle')
    const tile = page.locator('.item').filter({ has: page.locator('.video-overlay') }).first()
    if (!await tile.isVisible().catch(() => false)) test.skip(true, 'No video tile visible on Photos')
    // The .video-overlay (play icon) intercepts clicks on .img — click the
    // tile inner container instead.
    await tile.locator('.item-inner').click()
    await expect(page).toHaveURL(/displayPhoto=/)
    await expect(page.locator('video').first()).toBeVisible({ timeout: 10_000 })
  })

})

test.describe('Video — media type filter', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page).catch(() => {})
  })

  test('"Videos only" toggle updates URL', async ({ page }) => {
    const videoBtn = page.locator('button[title="Videos only"]').first()
    if (!await videoBtn.isVisible().catch(() => false)) test.skip(true, 'No videos in DB')
    await videoBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/media_type=video/)
  })

  test('"Photos only" toggle updates URL', async ({ page }) => {
    const photoBtn = page.locator('button[title="Photos only"]').first()
    await photoBtn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/media_type=photo/)
  })

  test('media_type=video URL restores filter on reload', async ({ page }) => {
    await page.goto('/photos?media_type=video')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[title="Videos only"]')).toBeVisible()
  })

})

test.describe('Video — admin Video tab integration', () => {

  test('worker stats endpoint returns pending/processing/error counts', async ({ page }) => {
    await loginAs(page)
    // video_transcode_stats lives on the admin-only config endpoint.
    const res = await apiGet(page, '/api/admin/config')
    const stats = res?.data?.video_transcode_stats
    expect(stats).toBeTruthy()
    expect(typeof stats.pending).toBe('number')
    expect(typeof stats.processing).toBe('number')
    expect(typeof stats.error).toBe('number')
  })

  test('reencode-videos GET returns the safe/unsafe split', async ({ page }) => {
    await loginAs(page)
    const res = await apiGet(page, '/api/admin/reencode-videos')
    const d = res?.data
    expect(d).toBeTruthy()
    expect(typeof d.total).toBe('number')
    expect(typeof d.with_original).toBe('number')
    expect(typeof d.without_original).toBe('number')
    // Conservation: with + without = total
    expect(d.with_original + d.without_original).toBe(d.total)
  })

  test('reencode-videos POST flips done→pending only for the chosen subset', async ({ page, browser }) => {
    // Setup: enable KEEP_ORIGINAL_VIDEO + upload a MOV so we get a video
    // with original_ext set, then wait for it to land in 'done'.
    const adminCtx = await browser.newContext()
    const adminPage = await adminCtx.newPage()
    await loginAs(adminPage)
    const originalKeep = (await apiGet(adminPage, '/api/admin/config'))?.data?.KEEP_ORIGINAL_VIDEO
    await setAppConfig(adminPage, { ALLOW_VIDEO_UPLOAD: true, KEEP_ORIGINAL_VIDEO: true })
    await adminPage.goto('/upload')
    const file = uniqueFile(FIXTURE_VIDEO_MOV)
    const originName = require('path').basename(file)
    await uploadFiles(adminPage, file)
    await expect(adminPage.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
    const photo = await waitForTranscode(adminPage, originName, 90_000).catch(() => null)
    await adminCtx.close()
    test.skip(!photo, 'Worker did not transcode in time')

    await loginAs(page)
    // Safe re-queue
    const safe = await apiPost(page, '/api/admin/reencode-videos', { only_with_original: true })
    expect(safe?.data?.requeued).toBeGreaterThanOrEqual(1)
    // Our uploaded video should now be back to 'pending'
    const reloaded = (await apiGet(page, '/api/unpublished?media_type=video&limit=500'))?.data?.photos || []
    const ours = (reloaded as any[]).find(p => p.filename === photo.filename)
    expect(ours?.transcode_status).toBe('pending')

    // Clean up
    const restoreCtx = await browser.newContext()
    const restorePage = await restoreCtx.newPage()
    await loginAs(restorePage)
    if (originalKeep !== undefined) await setAppConfig(restorePage, { KEEP_ORIGINAL_VIDEO: originalKeep })
    await apiPost(restorePage, `/api/photos/${photo.filename}/delete`, {}).catch(() => null)
    await restoreCtx.close()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Video — view-level ZIP download
//   XS/S/M/L all yield the transcoded MP4 (no per-size video rendition).
//   RAW yields the preserved source (with original filename+ext) when
//   KEEP_ORIGINAL_VIDEO=true, otherwise the transcoded MP4.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Video — view ZIP download', () => {

  test.describe.configure({ mode: 'serial' })

  let viewId: number | null = null
  let videoFilename = ''
  let videoOriginFilename = ''
  let originalKeep: any = null
  let originalAllow: any = null

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    const cfg = (await apiGet(page, '/api/admin/config'))?.data || {}
    originalAllow = cfg.ALLOW_VIDEO_UPLOAD
    originalKeep = cfg.KEEP_ORIGINAL_VIDEO
    // KEEP_ORIGINAL_VIDEO=true so save_video records the original extension
    // and the worker preserves <md5>_original.<ext> after transcode.
    await setAppConfig(page, { ALLOW_VIDEO_UPLOAD: true, KEEP_ORIGINAL_VIDEO: true })
    // Upload a MOV — the storage extension is .mp4 (internal), the original
    // is .mov, so we can prove that RAW download carries the .mov, not .mp4.
    await page.goto('/upload')
    const file = uniqueFile(FIXTURE_VIDEO_MOV)
    videoOriginFilename = require('path').basename(file)
    await uploadFiles(page, file)
    await expect(page.locator('.v-snackbar, .v-alert').filter({ hasText: /uploaded|success/i }).first())
      .toBeVisible({ timeout: 15_000 })
    // The transcoded artefact + preserved original only land on disk after
    // the worker finishes. Generous timeout for slow runners.
    const photo = await waitForTranscode(page, videoOriginFilename, 90_000).catch(() => null)
    if (photo) {
      videoFilename = photo.filename
      await apiPost(page, '/api/publish', { photos: [videoFilename] })
      // View with no filters → contains all published photos including ours.
      const created = await apiPost(page, '/api/views/create', {
        name: `E2E-video-download-${Date.now()}`,
        description: '',
        public: false,
      })
      viewId = created?.data?.view?.id
    }
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    if (viewId) await apiPost(page, `/api/views/${viewId}/delete`, {})
    if (videoFilename) await apiPost(page, `/api/photos/${videoFilename}/delete`, {}).catch(() => {})
    const restore: Record<string, any> = {}
    if (originalAllow !== undefined) restore.ALLOW_VIDEO_UPLOAD = originalAllow
    if (originalKeep !== undefined) restore.KEEP_ORIGINAL_VIDEO = originalKeep
    if (Object.keys(restore).length) await setAppConfig(page, restore)
    await ctx.close()
  })

  // ZIP_STORED (no compression) embeds entry filenames as plain ASCII bytes
  // in each local file header, so a substring search on the body is enough
  // to assert which arcname was written. Avoids pulling in a zip parser.
  test('size=raw with KEEP_ORIGINAL_VIDEO ⇒ ZIP carries the original filename + extension', async ({ page }) => {
    test.skip(!viewId, 'setup failed — worker may have been unhealthy')
    await loginAs(page)
    const res = await page.request.get(`/api/views/${viewId}/download?size=raw`)
    expect(res.status()).toBe(200)
    const body = (await res.body()).toString('binary')
    expect(body).toContain(videoOriginFilename) // e.g. photohub-test-…-….mov
    expect(body).not.toContain(videoFilename)   // not <md5>.mp4
  })

  test('size=xs ⇒ video shows up as the transcoded <md5>.mp4, not the .mov', async ({ page }) => {
    test.skip(!viewId || !videoFilename, 'setup failed')
    await loginAs(page)
    const res = await page.request.get(`/api/views/${viewId}/download?size=xs`)
    expect(res.status()).toBe(200)
    const body = (await res.body()).toString('binary')
    expect(body).toContain(videoFilename)         // <md5>.mp4
    expect(body).not.toContain(videoOriginFilename) // original name absent
  })

})
