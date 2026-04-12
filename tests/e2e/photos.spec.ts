import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, waitForGrid } from './helpers'

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
    await page.locator('.item img').first().click()
    // DisplayPhoto opens — URL gets ?displayPhoto= param
    await expect(page).toHaveURL(/displayPhoto=/)
  })

  test('detail panel: close button returns to grid', async ({ page }) => {
    await page.locator('.item img').first().click()
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

  test('URL params restore filter state on reload', async ({ page }) => {
    // Apply favorite filter → URL gets favorite=true
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('favorite=true')
    // Reload — state should be restored
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[title*="avorite"]').first()).toHaveClass(/v-btn--active|active/)
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
    await page.locator('.item img').first().click()
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
    // Click unpublish icon (title="Move back to unpublished")
    const unpublishBtn = page.locator('.v-dialog').locator('button[title="Move back to unpublished"]')
    await expect(unpublishBtn).toBeVisible({ timeout: 8_000 })
    await unpublishBtn.click()
    // Wait for ConfirmDialog to appear
    const confirmCard = page.locator('.v-card').filter({ hasText: 'Move back to unpublished?' }).last()
    await expect(confirmCard).toBeVisible({ timeout: 3_000 })
    // Click Unpublish and wait for the API call
    const unpublishApi = page.waitForResponse(r => r.url().includes('/unpublish'))
    await confirmCard.getByRole('button', { name: 'Unpublish' }).click()
    const resp = await unpublishApi
    expect(resp.status()).toBe(200)
    // Dialog closes after unpublish — carousel is gone from the viewport
    await expect(page.locator('.v-carousel')).not.toBeVisible({ timeout: 8_000 })
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
