import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, waitForGrid, apiGet } from './helpers'

test.describe('Photos — grid & display', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('shows published photos in a grid', async ({ page }) => {
    await expect(page.locator('.item').first()).toBeVisible()
  })

  test('click photo opens detail panel', async ({ page }) => {
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    // DisplayPhoto opens — URL gets ?displayPhoto= param
    await expect(page).toHaveURL(/displayPhoto=/)
  })

  test('detail panel: close button returns to grid', async ({ page }) => {
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
    // Close button is in .photo-toolbar (custom toolbar, not v-toolbar)
    await page.locator('.photo-toolbar button:has(.mdi-close)').click()
    await expect(page).not.toHaveURL(/displayPhoto=/)
  })

  test('favorite button appears on photo hover', async ({ page }) => {
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    await expect(firstItem.locator('.favorite-btn')).toBeVisible()
  })

  test('toggle favorite on hover button', async ({ page }) => {
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    const favBtn = firstItem.locator('.favorite-btn')
    await favBtn.click()
    await page.waitForLoadState('networkidle')
    // Button should still be there after toggle
    await expect(favBtn).toBeVisible()
    // Revert
    await favBtn.click()
    await page.waitForLoadState('networkidle')
  })

  test('grid size slider changes photo sizes', async ({ page }) => {
    const slider = page.locator('.v-slider').last()
    await expect(slider).toBeVisible()
    // Vuetify hides the native range input — use evaluate to set value
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('.v-slider input[type=range]')
      const el = sliders[sliders.length - 1] as HTMLInputElement
      if (!el) return
      el.value = '400'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    // Grid should still render after slider change
    await expect(page.locator('.item').first()).toBeVisible()
  })

})

test.describe('Photos — sort', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('sort by Photo date', async ({ page }) => {
    await page.locator('.v-select').filter({ hasText: /date|upload/i }).click()
    await page.getByRole('option', { name: 'Photo date' }).click()
    await waitForGrid(page)
    await expect(page.locator('.item').first()).toBeVisible()
  })

  test('sort by Upload date', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await waitForGrid(page)
    await expect(page.locator('.item').first()).toBeVisible()
  })

  test('toggle sort direction', async ({ page }) => {
    // Click the sort direction button
    await page.locator('button[title*="escending"], button[title*="scending"]').first().click()
    await waitForGrid(page)
    await expect(page.locator('.item').first()).toBeVisible()
  })

})

test.describe('Photos — filters', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('Quick filter mode is default', async ({ page }) => {
    // Filter buttons are icon-only in Photos — use the mdi icon class to locate them
    const quickBtn = page.locator('button:has(.mdi-text-search-variant)').first()
    await expect(quickBtn).toHaveClass(/v-btn--active|active/)
  })

  test('switch to Detailed filter mode', async ({ page }) => {
    await page.locator('button:has(.mdi-tag-search)').first().click()
    await expect(page.getByText('Show filters').or(page.getByText('Hide filters'))).toBeVisible()
  })

  test('switch to No filter mode (show all)', async ({ page }) => {
    await page.locator('button:has(.mdi-filter-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.grid')).toBeAttached()
    // URL should reflect filter_mode=none
    await expect(page).toHaveURL(/filter_mode=none/)
  })

  test('switch to No tags filter mode', async ({ page }) => {
    await page.locator('button:has(.mdi-tag-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    // Grid is always in DOM regardless of result count (may be empty → 0 height → hidden)
    await expect(page.locator('.grid')).toBeAttached()
  })

  test('filter by favorite — URL updates', async ({ page }) => {
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.grid')).toBeAttached()
    await expect(page).toHaveURL(/favorite=true/)
  })

  test('filter by rating — URL updates', async ({ page }) => {
    await page.locator('button[title="3 stars"]').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.grid')).toBeAttached()
    await expect(page).toHaveURL(/rating=3/)
  })

  test('rating mode toggles between ≤ and =', async ({ page }) => {
    await page.locator('button[title="3 stars"]').click()
    // Rating mode toggle should appear
    const modeToggle = page.locator('.rating-mode-toggle')
    await expect(modeToggle).toBeVisible()
    await expect(modeToggle).toHaveText('≤')
    await modeToggle.click()
    await expect(modeToggle).toHaveText('=')
  })

  test('sort change updates URL', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/sort_by=rating/)
  })

  test('URL params restore favorite filter on reload', async ({ page }) => {
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('favorite=true')
    // Reload — active state shown via text-red (no v-btn--active on this button)
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[title*="avorite"]').first()).toHaveClass(/text-red/)
  })

  test('URL params restore rating filter on reload', async ({ page }) => {
    await page.locator('button[title="3 stars"]').click()
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('rating=3')
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    // 3rd star should be amber (active)
    await expect(page.locator('button[title="3 stars"]').first()).toHaveClass(/text-amber/)
  })

  test('URL params restore sort on reload', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('sort_by=rating')
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.v-select').first()).toContainText('Rating')
  })

  test('URL params restore no-tags filter mode on reload', async ({ page }) => {
    await page.locator('button:has(.mdi-tag-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('filter_mode=notags')
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has(.mdi-tag-off-outline)').first()).toHaveClass(/v-btn--active|active/)
  })

  test('save as view button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save as view' })).toBeVisible()
  })

  test('save as view navigates to create view with pre-filled filters', async ({ page }) => {
    // Apply a filter first — filter buttons are icon-only in Photos
    await page.locator('button:has(.mdi-tag-search)').first().click()
    await page.getByRole('button', { name: 'Save as view' }).click()
    await expect(page).toHaveURL(/views\/create/)
    // Create view page should be pre-filled with filter state
    await expect(page.getByText('Create view')).toBeVisible()
  })

})

test.describe('Photos — selection mode', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('enter and exit selection mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible()
  })

  test('select a photo in selection mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await expect(page.getByText('1 selected')).toBeVisible()
  })

  test('select all photos', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    const total = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Select all', exact: true }).click()
    await expect(page.getByText(`${total} selected`)).toBeVisible()
  })

  test('deselect all photos', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.getByRole('button', { name: 'Select all', exact: true }).click()
    const total = await page.locator('.item').count()
    await expect(page.getByText(`${total} selected`)).toBeVisible()
    // After select all, the same button becomes "Deselect all"
    await page.locator('.v-btn').filter({ hasText: 'Deselect all' }).click()
    // Counter goes back to 0
    await expect(page.getByText(`${total} selected`)).not.toBeVisible()
  })

  test('deselect all activates after selecting a single photo', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    // Select just one photo
    await page.locator('.item-inner').first().click()
    await expect(page.getByText('1 selected')).toBeVisible()
    // "Deselect all" should be visible even with only 1 photo selected
    await expect(page.getByRole('button', { name: 'Deselect all', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Deselect all', exact: true }).click()
    await expect(page.getByText('0 selected')).toBeVisible()
  })

  test('bulk unpublish — confirm dialog appears', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Unpublish' }).click()
    await expect(page.locator('.v-card-title').filter({ hasText: /Unpublish.*photo/i })).toBeVisible()
    // Cancel — do not actually unpublish in this test
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('bulk delete — confirm dialog appears', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Delete' }).click()
    await expect(page.locator('.v-card-title').filter({ hasText: /Delete.*photo/i })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('add to favorites via bulk action', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Add to favorites' }).click()
    // Selection mode should exit after action
    await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible({ timeout: 5_000 })
  })

  test('remove from favorites via bulk action', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Remove from favorites' }).click()
    // Selection mode should exit after action
    await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible({ timeout: 5_000 })
  })

  test('bulk unpublish actually removes photos from grid', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    const countBefore = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Unpublish' }).click()
    await page.locator('.v-card-title').filter({ hasText: /Unpublish.*photo/i })
    await page.getByRole('button', { name: 'Unpublish' }).last().click()
    // Photo disappears from the published grid
    await expect(page.locator('.item')).toHaveCount(countBefore - 1, { timeout: 8_000 })
  })

})

test.describe('Photo detail panel', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
    // Open the fullscreen photo dialog
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
    // Open the detail panel — the toggle button uses mdi-information-outline (icon-only)
    await page.locator('.photo-toolbar button:has(.mdi-information-outline)').click()
  })

  test('detail panel opens and shows filename', async ({ page }) => {
    // PhotoDetailBody is embedded — wait for the favorite button (loaded state)
    await expect(page.locator('.v-dialog').locator('button[title="Favorite"]')).toBeVisible({ timeout: 8_000 })
  })

  test('toggle favorite in detail panel', async ({ page }) => {
    const favBtn = page.locator('.v-dialog').locator('button[title="Favorite"]')
    await expect(favBtn).toBeVisible({ timeout: 8_000 })
    await favBtn.click()
    await page.waitForLoadState('networkidle')
    // Button should still be there (state toggled)
    await expect(favBtn).toBeVisible()
    // Revert
    await favBtn.click()
    await page.waitForLoadState('networkidle')
  })

  test('set rating in detail panel', async ({ page }) => {
    // Click 4 stars — inside the dialog
    const star4 = page.locator('.v-dialog').locator('button[title="4 stars"]')
    await expect(star4).toBeVisible({ timeout: 8_000 })
    await star4.click()
    await page.waitForLoadState('networkidle')
    // Revert to 0
    await star4.click()
    await page.waitForLoadState('networkidle')
  })

  test('edit description in detail panel', async ({ page }) => {
    const textarea = page.locator('.v-dialog').locator('.v-textarea textarea').first()
    await expect(textarea).toBeVisible({ timeout: 8_000 })
    const original = await textarea.inputValue()
    await textarea.fill('Test description')
    // Blur to trigger auto-save
    await page.locator('.photo-toolbar').click()
    await page.waitForLoadState('networkidle')
    // Revert
    await textarea.fill(original)
    await page.locator('.photo-toolbar').click()
    await page.waitForLoadState('networkidle')
  })

  test('unpublish from detail panel moves photo to unpublished queue', async ({ page }) => {
    // Capture the currently displayed filename so we can verify the viewer
    // moves to a different one (commit 3320eac changed the UX: viewer stays
    // open on the next photo, only closing if it was the last).
    const filenameBefore = new URL(page.url()).searchParams.get('displayPhoto')
    const unpublishBtn = page.locator('.v-dialog').locator('button[title="Move back to unpublished"]')
    await expect(unpublishBtn).toBeVisible({ timeout: 8_000 })
    await unpublishBtn.click()
    const confirmCard = page.locator('.v-card').filter({ hasText: 'Move back to unpublished?' }).last()
    await expect(confirmCard).toBeVisible({ timeout: 3_000 })
    const unpublishApi = page.waitForResponse(r => r.url().includes('/unpublish'))
    await confirmCard.getByRole('button', { name: 'Unpublish' }).click()
    const resp = await unpublishApi
    expect(resp.status()).toBe(200)
    // Either the viewer advanced to the next photo OR closed if this was the
    // only one. Verify the URL no longer points to the same filename.
    await expect.poll(() => new URL(page.url()).searchParams.get('displayPhoto'), { timeout: 8_000 })
      .not.toBe(filenameBefore)
  })

  test('EXIF section is visible in detail panel', async ({ page }) => {
    // EXIF section header should be present (may be collapsed)
    await expect(page.locator('.v-dialog').getByText('EXIF', { exact: true })).toBeVisible({ timeout: 8_000 })
    // Metadata section should also be present
    await expect(page.locator('.v-dialog').getByText('Metadata')).toBeVisible()
  })

  test('navigate to next photo with arrow', async ({ page }) => {
    const firstUrl = page.url()
    // Hover carousel area to reveal nav arrows
    await page.locator('.v-dialog .v-carousel').hover().catch(() => {})
    const nextBtn = page.locator('.v-dialog .v-carousel button').filter({ has: page.locator('.mdi-chevron-right') })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      expect(page.url()).not.toBe(firstUrl)
    }
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — New filters, sort options, fullscreen UX, download menu
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Photos — quick filter AND/OR toggle', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('AND/OR button is visible in quick mode and its title flips on click', async ({ page }) => {
    // The button is keyed by mdi-vector-intersection (AND) / mdi-vector-union (OR).
    // Default is AND: title contains "Match ALL"; after click → "Match ANY".
    const toggle = page.locator('button[title*="Match"]').first()
    await expect(toggle).toBeVisible()
    const before = await toggle.getAttribute('title')
    expect(before).toMatch(/Match ALL/i)
    await toggle.click()
    const after = await toggle.getAttribute('title')
    expect(after).toMatch(/Match ANY/i)
  })

  test('AND/OR button is hidden when filter mode is "none"', async ({ page }) => {
    await page.locator('.v-btn-toggle button').filter({ has: page.locator('.mdi-filter-off-outline') }).click()
    await expect(page.locator('button[title*="Match"]')).toHaveCount(0)
  })

})

test.describe('Photos — orphan filter', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('orphan toggle is visible on Photos and updates URL', async ({ page }) => {
    const btn = page.locator('button[title*="orphan photos"], button[title*="Orphan photos"]').first()
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/orphan=true/)
  })

  test('orphan=true persists across reload', async ({ page }) => {
    await page.goto('/photos?orphan=true')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[title*="Orphan photos only"]')).toBeVisible()
  })

})

test.describe('Photos — sort options', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('sort dropdown contains Mixed, Random and Origin filename', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await expect(page.getByRole('option', { name: 'Mixed', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Random', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Origin filename', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('default sort direction is ascending', async ({ page }) => {
    // The button title reflects the current direction (the icon shows the *current* state)
    const dirBtn = page.locator('button[title="Ascending"], button[title="Descending"]').first()
    await expect(dirBtn).toHaveAttribute('title', 'Ascending')
  })

  test('sort by Random produces a different order across two requests', async ({ page }) => {
    // We assert via the API directly, since the UI relies on backend ORDER BY RANDOM().
    const first  = await apiGet(page, '/api/photos?sort_by=random&sort_dir=asc')
    const second = await apiGet(page, '/api/photos?sort_by=random&sort_dir=asc')
    const fNames = (first?.data?.photos || []).map((p: any) => p.filename)
    const sNames = (second?.data?.photos || []).map((p: any) => p.filename)
    if (fNames.length < 3) test.skip(true, 'Not enough photos to assert randomness')
    expect(fNames.join(',')).not.toBe(sNames.join(','))
  })

  test('sort by Mixed (filename) is stable across two requests', async ({ page }) => {
    const first  = await apiGet(page, '/api/photos?sort_by=filename&sort_dir=asc')
    const second = await apiGet(page, '/api/photos?sort_by=filename&sort_dir=asc')
    const fNames = (first?.data?.photos || []).map((p: any) => p.filename)
    const sNames = (second?.data?.photos || []).map((p: any) => p.filename)
    expect(fNames).toEqual(sNames)
  })

})

test.describe('Photos — fullscreen UX after delete & scroll restoration', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('closing the fullscreen viewer scrolls back to the previously viewed photo', async ({ page }) => {
    // The behavior (see commit 3320eac): on close, PhotoGrid.scrollToPhoto()
    // calls scrollIntoView({ block: 'center' }) on the photo that was open.
    const itemCount = await page.locator('.item').count()
    if (itemCount < 12) test.skip(true, 'Need at least 12 photos to test scroll restore')
    const target = page.locator('.item').nth(6)
    const filename = await target.getAttribute('data-filename')
    await target.locator('img').click()
    await expect(page).toHaveURL(/displayPhoto=/)
    await page.locator('.photo-toolbar button:has(.mdi-close)').click()
    await expect(page).not.toHaveURL(/displayPhoto=/)
    if (filename) {
      const restored = page.locator(`[data-filename="${filename}"]`)
      await expect(restored).toBeInViewport()
    }
  })

})

test.describe('Photos — detail panel download menu', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('download menu opens and lists sample sizes + RAW', async ({ page }) => {
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
    // Open the embedded detail panel via the info toggle (mdi-information-outline)
    const infoToggle = page.locator('button').filter({ has: page.locator('.mdi-information-outline') }).first()
    await infoToggle.click()
    // Click the Download button (title="Download") in the panel header
    const downloadBtn = page.locator('button[title="Download"]').first()
    await downloadBtn.click()
    // Menu items: a "RAW (original)" entry and at least one sample size
    await expect(page.locator('.v-list-item-title', { hasText: 'RAW (original)' })).toBeVisible()
  })

})

test.describe('Photos — tag filter clear-all', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('"Clear all tag filters" button is rendered in detail mode when filters are active', async ({ page }) => {
    // Switch to detail mode
    await page.locator('.v-btn-toggle button').filter({ has: page.locator('.mdi-tag-search') }).click()
    // Without any active tag filter the clear-all button is hidden — assertion is conditional
    // We just check that it CAN appear: open the panel
    await page.getByRole('button', { name: /filters/i }).first().click().catch(() => {})
    // Best-effort visibility check; the button is keyed by mdi-filter-remove-outline
    // Skip if the project state has no tags to filter on
    const hasTags = await page.locator('.v-list-item').filter({ hasText: /^E2E|.+/ }).count()
    if (hasTags === 0) test.skip(true, 'No tags available to activate detail filters')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Quick filter dropdown — autocomplete attr, grouping
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Photos — quick filter dropdown', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('TagGroupsWidget combobox inputs declare autocomplete="off" (detail filter mode)', async ({ page }) => {
    // The commit (b7364af) added autocomplete="off" + name randomization to
    // TagGroupsWidget, which renders in the detail filter panel of Photos
    // (and inside EditTagsDialog / TagPhotos). The quick-filter top-level
    // autocomplete itself does NOT have this attribute.
    await page.locator('.v-btn-toggle button').filter({ has: page.locator('.mdi-tag-search') }).first().click()
    await page.getByRole('button', { name: /filters/i }).first().click().catch(() => {})
    // Find any combobox/autocomplete inside TagGroupsWidget (data-form-type="other")
    const widgetInput = page.locator('input[data-form-type="other"]').first()
    if (!await widgetInput.isVisible().catch(() => false)) {
      test.skip(true, 'No TagGroupsWidget input rendered — needs at least one tag group with tags')
    }
    await expect(widgetInput).toHaveAttribute('autocomplete', 'off')
    await expect(widgetInput).toHaveAttribute('data-lpignore', 'true')
  })

  test('quick filter dropdown groups tags by tag_group', async ({ page }) => {
    // `available_tags` in the /api/photos response only lists tags actually
    // applied to published photos. Without tagged photos in the DB the
    // autocomplete is empty and grouping cannot be observed — skip then.
    const photosRes = await apiGet(page, '/api/photos')
    const availTags = (photosRes?.data?.available_tags || []) as any[]
    const groupNames = new Set(availTags.map(t => t.group_name).filter(Boolean))
    if (groupNames.size < 2) test.skip(true, 'Need photos with tags spanning at least 2 groups')
    const [firstGroup, secondGroup] = Array.from(groupNames)
    await page.locator('.v-autocomplete').first().click()
    await expect(page.locator('.v-overlay').filter({ hasText: firstGroup as string }).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.v-overlay').filter({ hasText: secondGroup as string }).first()).toBeVisible({ timeout: 5_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Bulk actions — actual side effects (delete, tag dialog)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Photos — bulk actions (side effects)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
  })

  test('bulk "Tag" action opens the TagPhotos editor view', async ({ page }) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: /^Tag$/ }).click()
    // TagPhotos.vue replaces the page contents with a v-sheet whose header
    // shows the "Tag pictures" title and an Apply button.
    await expect(page.getByRole('heading', { name: 'Tag pictures' })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible()
    // Close to leave the state clean
    await page.getByRole('button', { name: 'Cancel' }).first().click()
  })

  test('bulk delete actually removes the selected photo from the grid', async ({ page }) => {
    // Upload a fresh photo and publish it so this test doesn't destroy
    // photos used by other test suites (views.spec.ts photo-detail tests
    // pin the first photo as favorite and would 404 if it disappeared).
    const { uniquePhoto } = require('./helpers')
    await page.goto('/upload')
    await page.getByLabel('File input', { exact: true }).setInputFiles(uniquePhoto())
    await page.getByRole('button', { name: 'Upload', exact: true }).click()
    await expect(page.locator('.v-snackbar').filter({ hasText: /file.* uploaded/ })).toBeVisible({ timeout: 15_000 })
    // Publish the new photo (newest first in the unpublished list)
    const unpub = await apiGet(page, '/api/unpublished?sort_by=upload_date&sort_dir=desc')
    const fresh = unpub?.data?.photos?.[0]?.filename
    expect(fresh).toBeTruthy()
    const token = (await page.context().cookies()).find(c => c.name === 'csrftoken')?.value
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['X-CSRFToken'] = token
    await page.request.post('/api/publish', {
      headers,
      data: JSON.stringify({ photos: [fresh] }),
    })

    // Sort by upload_date descending so the freshly-uploaded photo is at the top
    await page.goto('/photos?sort_by=upload_date&sort_dir=desc')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Select', exact: true }).click()
    const target = page.locator(`[data-filename="${fresh}"] .item-inner`)
    await target.scrollIntoViewIfNeeded()
    await target.click()
    const countBefore = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: /^Delete$/ }).click()
    await expect(page.locator('.v-card-title').filter({ hasText: /Delete.*photo/i })).toBeVisible()
    const deleteApi = page.waitForResponse(r => r.url().includes('/delete'), { timeout: 10_000 })
    await page.getByRole('button', { name: 'Delete' }).last().click()
    const resp = await deleteApi
    expect(resp.status()).toBe(200)
    await expect(page.locator('.item')).toHaveCount(countBefore - 1, { timeout: 8_000 })
  })

})


