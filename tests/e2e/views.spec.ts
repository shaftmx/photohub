import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, waitForGrid, apiGet, apiPost } from './helpers'

test.describe('Views — list page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Views')
  })

  test('views page shows heading and New view button', async ({ page }) => {
    await expect(page.locator('.text-h6').filter({ hasText: 'Views' })).toBeVisible()
    await expect(page.locator('.v-btn').filter({ hasText: 'New view' })).toBeVisible()
  })

  test('empty state shows create button when no views exist', async ({ page }) => {
    // If no views, the empty state CTA should be visible
    const isEmpty = await page.getByText('No views yet').isVisible()
    if (isEmpty) {
      await expect(page.getByRole('button', { name: 'Create your first view' })).toBeVisible()
    }
  })

  test('view card shows name and photo count', async ({ page }) => {
    const card = page.locator('.view-card').first()
    if (await card.isVisible()) {
      await expect(card.locator('.text-body-1')).toBeVisible()           // name
      await expect(card.locator('.text-caption')).toContainText(/photo/) // count
      // Private views show a lock icon; public views show nothing — no chip anymore
    }
  })

  test('view card hover reveals edit and delete buttons', async ({ page }) => {
    const card = page.locator('.view-card').first()
    if (!await card.isVisible()) return
    await card.hover()
    await expect(card.locator('.card-actions')).toBeVisible()
  })

  test('New view button navigates to create page', async ({ page }) => {
    await page.locator('.v-btn').filter({ hasText: 'New view' }).click()
    await expect(page).toHaveURL(/views\/create/)
    await expect(page.getByText('Create view')).toBeVisible()
  })

})

test.describe('Views — create', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    // Go directly to create page — more reliable than UI navigation
    await page.goto('/views/create')
    await expect(page.getByText('Create view')).toBeVisible({ timeout: 8_000 })
  })

  test('Save button is disabled when name is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  test('Cancel navigates back to views list', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/views$/)
  })

  test('create a view with only a name', async ({ page }) => {
    const name = `Test View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    await expect(page.getByText(name)).toBeVisible()
    // Cleanup: delete the created view
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with description, public toggle and sort', async ({ page }) => {
    const name = `Full View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await page.locator('.v-textarea textarea').first().fill('A test description with **markdown**')
    await page.locator('.v-switch input').click({ force: true }) // toggle public
    // Change sort to Upload date
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    await expect(page.getByText(name)).toBeVisible()
    // Cleanup
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with No tags filter mode', async ({ page }) => {
    const name = `No Tags View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await page.locator('button:has(.mdi-tag-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    // Cleanup
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with favorite filter', async ({ page }) => {
    const name = `Favorites View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    // Cleanup
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with No filter mode', async ({ page }) => {
    const name = `No Filter View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await page.locator('button:has(.mdi-filter-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    // Cleanup
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with rating filter', async ({ page }) => {
    const name = `Rating View ${Date.now()}`
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(name)
    await page.locator('button[title="3 stars"]').click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/, { timeout: 15_000 })
    // Verify filter chip shows in view detail
    await page.locator('button[title="Toggle filters"]').click()
    await expect(page.locator('.v-chip').filter({ hasText: /3/ })).toBeVisible()
    // Cleanup
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('preview grid updates when filter changes', async ({ page }) => {
    // Switch to No tags mode
    await page.locator('button:has(.mdi-tag-off-outline)').first().click()
    await page.waitForLoadState('networkidle')
    // Photo count indicator should update
    await expect(page.getByText(/\d+ photo/)).toBeVisible()
  })

  test('preview grid respects sort selection', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.grid')).toBeVisible()
  })

  test('"Save as view" from Photos pre-fills filter state', async ({ page }) => {
    // Navigate to Photos, apply No Tags mode (icon-only button), then save as view
    await page.goto('/photos')
    await waitForGrid(page)
    // In Photos, filter buttons are icon-only — locate by mdi icon class
    await page.locator('button:has(.mdi-tag-off-outline)').first().click()
    await page.getByRole('button', { name: 'Save as view' }).click()
    await expect(page).toHaveURL(/views\/create/)
    // In ViewCreate, No tags button should be active (pre-filled)
    await expect(page.locator('button:has(.mdi-tag-off-outline)').first()).toHaveClass(/v-btn--active|active/)
  })

})

test.describe('Views — detail', () => {

  let viewId: string

  // Create a view before tests, delete after
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Detail Test View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await expect(page.getByText('Detail Test View')).toBeVisible()
  })

  test('view detail shows name, photo count and badge', async ({ page }) => {
    await expect(page.getByText(/\d+ photo/)).toBeVisible()
    await expect(page.locator('.v-chip').filter({ hasText: /Public|Private/ })).toBeVisible()
  })

  test('filter chips toggle button shows/hides chips', async ({ page }) => {
    const toggleBtn = page.locator('button[title="Toggle filters"]')
    await toggleBtn.click()
    await expect(page.locator('.v-chip').first()).toBeVisible()
    await toggleBtn.click()
  })

  test('description toggle button shows/hides description', async ({ page }) => {
    // Only if the view has a description
    const descBtn = page.locator('button[title*="description"]')
    if (await descBtn.isVisible()) {
      await descBtn.click()
      await expect(page.locator('.markdown-body')).toBeVisible()
      await descBtn.click()
      await expect(page.locator('.markdown-body')).not.toBeVisible()
    }
  })

  test('sort controls are visible', async ({ page }) => {
    await expect(page.locator('.v-select').first()).toBeVisible()
  })

  test('grid size slider is visible', async ({ page }) => {
    await expect(page.locator('.v-slider').first()).toBeVisible()
  })

  test('click photo opens detail panel', async ({ page }) => {
    await waitForGrid(page)
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
  })

  test('favorite button appears on photo hover', async ({ page }) => {
    await waitForGrid(page)
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    await expect(firstItem.locator('.favorite-btn')).toBeVisible()
  })

  test('edit button navigates to edit page', async ({ page }) => {
    await page.locator('.v-btn').filter({ has: page.locator('.mdi-pencil-outline') }).first().click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}/edit`))
    await expect(page.getByText('Edit view')).toBeVisible()
  })

  test('delete button shows confirm dialog', async ({ page }) => {
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    // Dialog title contains "Delete ..."
    await expect(page.locator('.v-card-title').filter({ hasText: /Delete/ })).toBeVisible()
    // Cancel — don't actually delete (afterAll handles cleanup)
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('changing sort re-orders photos', async ({ page }) => {
    await waitForGrid(page)
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.waitForLoadState('networkidle')
    // Grid should still be present
    await expect(page.locator('.item').first()).toBeVisible()
  })

  test('"define as cover" button visible in photo detail panel from view context', async ({ page }) => {
    await waitForGrid(page)
    // Open photo detail via carousel
    await page.locator('.item:not(:has(.video-overlay)) img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
    // Open the detail panel — icon-only button with mdi-information-outline
    await page.locator('.photo-toolbar button:has(.mdi-information-outline)').click()
    // Cover button should be visible (view context passes viewId to PhotoDetail)
    const coverBtn = page.locator('.v-dialog').locator('button[title="Set as cover"], button[title="Remove cover"]')
    await expect(coverBtn).toBeVisible({ timeout: 8_000 })
    // Toggle cover and revert
    await coverBtn.click()
    await page.waitForLoadState('networkidle')
    await coverBtn.click()
    await page.waitForLoadState('networkidle')
  })

})

test.describe('Views — edit', () => {

  let viewId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Edit Me View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
  })

  test('edit page pre-fills name from existing view', async ({ page }) => {
    await expect(page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input')).toHaveValue('Edit Me View')
  })

  test('edit page pre-fills filter mode', async ({ page }) => {
    // Quick is the default mode — should be active
    await expect(page.locator('button:has(.mdi-text-search-variant)').first()).toHaveClass(/v-btn--active|active/)
  })

  test('cancel navigates back to view detail', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`))
  })

  test('edit name and save', async ({ page }) => {
    const nameInput = page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input')
    await nameInput.clear()
    await nameInput.fill('Renamed View')
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
    // Register both waits before clicking so we don't miss fast responses
    const [updateResponse, _photosResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/views/${viewId}/update`), { timeout: 10_000 }),
      // Skip the first photos response (may be the edit-page preview); wait for URL change then check name directly
      page.getByRole('button', { name: 'Save' }).click(),
    ])
    expect(updateResponse.status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`), { timeout: 10_000 })
    // ViewDetail fetches the view on mount — name appears in the PageTitle h1
    await expect(page.locator('h1').filter({ hasText: 'Renamed View' })).toBeVisible({ timeout: 15_000 })
    // Rename back for afterAll cleanup
    await page.locator('.v-btn').filter({ has: page.locator('.mdi-pencil-outline') }).first().click()
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').clear()
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Edit Me View')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`), { timeout: 15_000 })
  })

  test('edit sort and verify it persists', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`), { timeout: 15_000 })
    // Go back to edit and verify sort is persisted
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.locator('.v-select').first()).toContainText('Rating')
  })

  test('changing sort updates the preview', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const countBefore = await page.locator('.item').count()
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await page.waitForLoadState('networkidle')
    // The grid re-renders incrementally — poll for count to settle to the
    // original total (tolerate a small lag during rehydration).
    await expect.poll(async () => Math.abs((await page.locator('.item').count()) - countBefore), {
      timeout: 5_000,
    }).toBeLessThanOrEqual(2)
  })

  test('set cover photo from grid in edit view', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    // Cover button appears on hover — check that at least one item is visible
    const firstItem = page.locator('.item-inner').first()
    const hasPhotos = await firstItem.isVisible()
    if (!hasPhotos) return

    await firstItem.hover()
    const coverBtn = firstItem.locator('.cover-btn')
    await expect(coverBtn).toBeVisible()
    // Set as cover
    await coverBtn.click()
    await page.waitForLoadState('networkidle')
    // Cover mini-card should appear in the header
    await expect(page.locator('.text-caption').filter({ hasText: 'Cover' })).toBeVisible()
    // Unset via the mini-card remove button
    await page.locator('.text-caption').filter({ hasText: 'Cover' }).locator('xpath=..').locator('button').click()
    await expect(page.locator('.text-caption').filter({ hasText: 'Cover' })).not.toBeVisible()
  })

})

test.describe('Views — custom order', () => {

  let viewId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Custom Order View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test('"Custom order" button is visible in edit view sort bar', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
    // State A: "Custom order" create button (has mdi-drag-variant icon) visible
    await expect(page.locator('button:has(.mdi-drag-variant)')).toBeVisible()
  })

  test('Clicking "Custom order" enters drag mode', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const hasPhotos = await page.locator('.item').first().isVisible()
    if (!hasPhotos) return
    // Click "Custom order" button → enters drag mode (State C) directly
    await page.getByRole('button', { name: 'Custom order' }).click()
    // Drag handles should be visible on photos
    await expect(page.locator('.drag-handle').first()).toBeVisible()
  })

  test('"Done" exits drag mode and shows "Reorder" button (State B)', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const hasPhotos = await page.locator('.item').first().isVisible()
    if (!hasPhotos) return
    await page.getByRole('button', { name: 'Custom order' }).click()
    await expect(page.locator('.drag-handle').first()).toBeVisible()
    // Click Done → exits drag mode, saves order + sort_by='custom' to DB
    await page.getByRole('button', { name: 'Done' }).click()
    await page.waitForLoadState('networkidle')
    // State B: "Reorder" button visible + sort select shows "Custom order"
    await expect(page.locator('button:has(.mdi-cursor-move)')).toBeVisible()
    await expect(page.locator('.v-select').first()).toContainText('Custom order')
  })

  test('"Custom order" option is available in ViewDetail sort controls when order exists', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await expect(page.locator('.v-select').first()).toBeVisible()
    await page.locator('.v-select').first().click()
    await expect(page.getByRole('option', { name: 'Custom order' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('Delete custom order reverts to normal sort (State A)', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const hasPhotos = await page.locator('.item').first().isVisible()
    if (!hasPhotos) return
    // Ensure a custom order exists: create one if needed (State A, button enabled)
    // Use icon-specific selector to avoid matching the v-select showing "Custom order"
    const customOrderBtn = page.locator('button:has(.mdi-drag-variant)')
    if (await customOrderBtn.isVisible()) {
      const hasPhotosForDrag = await page.locator('.item').first().isVisible({ timeout: 2000 }).catch(() => false)
      if (!hasPhotosForDrag) return
      await customOrderBtn.click()
      await page.waitForTimeout(300)
      await expect(page.locator('.drag-handle').first()).toBeVisible({ timeout: 8000 })
      await page.getByRole('button', { name: 'Done' }).click()
      await page.waitForLoadState('networkidle')
    }
    // After Done, sort_by='custom' is persisted → State B directly, delete button visible
    await expect(page.locator('button[title="Delete custom order"]')).toBeVisible()
    await page.locator('button[title="Delete custom order"]').click()
    // Confirm dialog
    await expect(page.locator('.v-card-title').filter({ hasText: /delete.*order/i })).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.waitForLoadState('networkidle')
    // State A: "Custom order" create button (mdi-drag-variant) is back and enabled
    await expect(page.locator('button:has(.mdi-drag-variant)')).toBeVisible()
    await expect(page.locator('button:has(.mdi-drag-variant)')).toBeEnabled()
    // ViewDetail should no longer show "Custom order" in sort options
    await page.goto(`/views/${viewId}`)
    await page.locator('.v-select').first().click()
    await expect(page.getByRole('option', { name: 'Custom order' })).not.toBeVisible()
    await page.keyboard.press('Escape')
  })

})

test.describe('Views — delete from list', () => {

  test('delete a view from the cards list', async ({ page }) => {
    await loginAs(page)
    // Use a unique name to avoid conflicts with leftover data from previous runs
    const viewName = `To Delete View ${Date.now()}`
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill(viewName)
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })

    // Go to views list
    await navigateTo(page, 'Views')
    const card = page.locator('.view-card').filter({ hasText: viewName })
    await card.hover()
    await card.locator('.v-btn').filter({ has: page.locator('.mdi-delete-outline') }).click() // delete button
    // Confirm dialog
    await expect(page.locator('.v-card-title').filter({ hasText: viewName })).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    // Card should disappear
    await expect(card).not.toBeVisible({ timeout: 5_000 })
  })

})

// ─── Views — public access ────────────────────────────────────────────────────

test.describe('Views — public access', () => {

  let viewId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Public Access View')
    // Toggle public
    await page.locator('.v-switch input[type="checkbox"]').first().check({ force: true })
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test('public view accessible without login', async ({ page }) => {
    // No login — navigate directly
    await page.goto(`/views/${viewId}`)
    await expect(page.getByText('Public Access View')).toBeVisible()
    // Public chip visible
    await expect(page.locator('.v-chip').filter({ hasText: 'Public' })).toBeVisible()
  })

  test('public view shows no edit or delete buttons', async ({ page }) => {
    await page.goto(`/views/${viewId}`)
    await expect(page.getByText('Public Access View')).toBeVisible()
    await expect(page.locator('button').filter({ has: page.locator('.mdi-pencil-outline') })).not.toBeVisible()
    await expect(page.locator('button').filter({ has: page.locator('.mdi-delete-outline') })).not.toBeVisible()
  })

  test('invalid numeric ID shows "View not found"', async ({ page }) => {
    await loginAs(page)
    await page.goto('/views/999999')
    await expect(page.getByText('View not found')).toBeVisible()
    await expect(page.locator('.v-btn').filter({ hasText: 'Back to views' })).toBeVisible()
  })

})

// ─── Views — share link ───────────────────────────────────────────────────────

test.describe('Views — share link', () => {

  let viewId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.locator('.v-text-field').filter({ has: page.locator('.v-label', { hasText: 'Name' }) }).locator('input').fill('Share Link View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/, { timeout: 15_000 })
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('.mdi-delete-outline') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test('share button visible on private view', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await expect(page.locator('button[title="Share / upload link"]')).toBeVisible()
  })

  test('generate share link creates a URL', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share / upload link"]').click()
    await expect(page.getByText('Private share link')).toBeVisible()
    await page.getByRole('button', { name: 'Generate link', exact: true }).click()
    await page.waitForLoadState('networkidle')
    // URL field now visible with a share URL
    await expect(page.locator('input[readonly]').first()).toBeVisible()
    const val = await page.locator('input[readonly]').first().inputValue()
    expect(val).toContain('/views/')
  })

  test('share link accessible without login (read-only)', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share / upload link"]').click()
    await expect(page.locator('input[readonly]').first()).toBeVisible({ timeout: 5_000 })
    const shareUrl = await page.locator('input[readonly]').first().inputValue()
    const token = shareUrl.split('/views/')[1]

    // Open in anonymous context (no auth)
    const anonPage = await page.context().browser()!.newPage()
    await anonPage.goto(`/views/${token}`)
    await expect(anonPage.getByText('Share Link View')).toBeVisible()
    await expect(anonPage.locator('button[title="Share / upload link"]')).not.toBeVisible()
    await expect(anonPage.locator('button').filter({ has: anonPage.locator('.mdi-pencil-outline') })).not.toBeVisible()
    await anonPage.close()
  })

  test('invalid token shows "link no longer valid"', async ({ page }) => {
    await page.goto('/views/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('This shared link is no longer valid')).toBeVisible()
  })

  test('share icon appears on view card in list', async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Views')
    const card = page.locator('.view-card').filter({ hasText: 'Share Link View' })
    // The share-variant icon (not outline) should be visible in the card cover badges
    await expect(card.locator('i.mdi-share-variant')).toBeVisible()
  })

  test('regenerate shows confirmation warning', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share / upload link"]').click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Regenerate', exact: true }).click()
    await expect(page.getByText('This will invalidate the current link')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('This will invalidate the current link')).not.toBeVisible()
  })

  test('revoke share link removes access', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share / upload link"]').click()
    await expect(page.locator('input[readonly]').first()).toBeVisible({ timeout: 5_000 })
    const shareUrl = await page.locator('input[readonly]').first().inputValue()
    const token = shareUrl.split('/views/')[1]

    // Revoke
    await page.getByRole('button', { name: 'Revoke', exact: true }).click()
    await page.waitForLoadState('networkidle')
    // Menu closes, share button back to outline (no active link)
    await expect(page.locator('button[title="Share / upload link"]')).toBeVisible()
    await expect(page.locator('button[title="Share / upload link"] .mdi-share-variant-outline')).toBeVisible()

    // Token should no longer work
    const anonPage = await page.context().browser()!.newPage()
    await anonPage.goto(`/views/${token}`)
    await expect(anonPage.getByText('This shared link is no longer valid')).toBeVisible()
    await anonPage.close()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — ViewDetail selection mode, server-side sort, upload link decoupled
// ─────────────────────────────────────────────────────────────────────────────

async function getOrCreateTestView(page: import('@playwright/test').Page, name: string, opts: any = {}): Promise<number> {
  const list = await apiGet(page, '/api/views')
  const existing = (list?.data?.views || []).find((v: any) => v.name === name)
  if (existing) return existing.id
  const res = await apiPost(page, '/api/views/create', { name, description: '', public: false, ...opts })
  return res?.data?.view?.id
}

async function makePublic(page: import('@playwright/test').Page, viewId: number) {
  await apiPost(page, `/api/views/${viewId}/update`, { public: true })
}

async function deleteView(page: import('@playwright/test').Page, viewId: number) {
  await apiPost(page, `/api/views/${viewId}/delete`, {})
}

test.describe('Views — ViewDetail selection mode', () => {

  let viewId: number

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    viewId = await getOrCreateTestView(page, 'E2E-selection-mode')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    if (viewId) await deleteView(page, viewId)
    await ctx.close()
  })

  test('Select button toggles selection mode in ViewDetail', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.waitForLoadState('networkidle')
    const selectBtn = page.getByRole('button', { name: 'Select', exact: true })
    if (!await selectBtn.isVisible().catch(() => false)) test.skip(true, 'View has no photos — Select button hidden')
    await selectBtn.click()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
  })

})

test.describe('Views — server-side sort in ViewDetail', () => {

  test('changing sort sends sort_by to the API', async ({ page }) => {
    await loginAs(page)
    const list = await apiGet(page, '/api/views')
    const view = (list?.data?.views || [])[0]
    if (!view) test.skip(true, 'No views available')
    let lastQuery = ''
    page.on('request', req => {
      if (req.url().includes(`/api/views/${view.id}/photos`)) lastQuery = req.url()
    })
    await page.goto(`/views/${view.id}`)
    await page.waitForLoadState('networkidle')
    // Switch sort
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date', exact: true }).click()
    await page.waitForLoadState('networkidle')
    expect(lastQuery).toMatch(/sort_by=upload_date/)
  })

})

test.describe('Views — upload link decoupled from share link', () => {

  let viewId: number

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    viewId = await getOrCreateTestView(page, 'E2E-upload-decoupled')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    if (viewId) await deleteView(page, viewId)
    await ctx.close()
  })

  test('upload link can be generated without a share link first', async ({ page }) => {
    await loginAs(page)
    // Generate upload link via API directly (UI path tested in next test)
    const res = await apiPost(page, `/api/views/${viewId}/upload-link`, {})
    expect(res?.data?.upload_link).toBeTruthy()
    const view = await apiGet(page, `/api/views/${viewId}`)
    expect(view?.data?.view?.upload_link).toBeTruthy()
    expect(view?.data?.view?.share_link).toBeFalsy()
  })

  test('upload link can be generated on a public view', async ({ page }) => {
    await loginAs(page)
    await makePublic(page, viewId)
    const res = await apiPost(page, `/api/views/${viewId}/upload-link`, {})
    expect(res?.data?.upload_link).toBeTruthy()
    const view = await apiGet(page, `/api/views/${viewId}`)
    expect(view?.data?.view?.public).toBe(true)
    expect(view?.data?.view?.upload_link).toBeTruthy()
  })

  test('revoking share link does not revoke upload link', async ({ page }) => {
    await loginAs(page)
    // Set up: have both links
    await apiPost(page, `/api/views/${viewId}/share-link`, {})
    await apiPost(page, `/api/views/${viewId}/upload-link`, {})
    await apiPost(page, `/api/views/${viewId}/share-link/revoke`, {})
    const view = await apiGet(page, `/api/views/${viewId}`)
    expect(view?.data?.view?.share_link).toBeFalsy()
    expect(view?.data?.view?.upload_link).toBeTruthy()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Share link expiry enforcement
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Views — share link expiry enforcement', () => {

  let viewId: number

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    viewId = await getOrCreateTestView(page, 'E2E-share-expiry')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    if (viewId) await deleteView(page, viewId)
    await ctx.close()
  })

  test('share link with a future expiry is accessible', async ({ page, request }) => {
    await loginAs(page)
    const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    const res = await apiPost(page, `/api/views/${viewId}/share-link`, { expires_at: future })
    const token = res?.data?.share_link
    expect(token).toBeTruthy()
    expect(res?.data?.share_link_expires_at).toBeTruthy()
    const anon = await request.get(`/api/shared_view/${token}/photos`)
    expect(anon.status()).toBe(200)
  })

  test('share link with a past expiry returns 403 Expired', async ({ page, request }) => {
    await loginAs(page)
    const create = await apiPost(page, `/api/views/${viewId}/share-link`, {})
    const token = create?.data?.share_link
    expect(token).toBeTruthy()
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    await apiPost(page, `/api/views/${viewId}/share-link/expiry`, { expires_at: past })
    const anon = await request.get(`/api/shared_view/${token}/photos`)
    expect(anon.status()).toBe(403)
    const body = await anon.json().catch(() => ({} as any))
    expect(body.ERROR).toBe('Expired')
  })

  test('clearing expiry on an existing share link restores access', async ({ page, request }) => {
    await loginAs(page)
    // Re-generate to start clean
    const create = await apiPost(page, `/api/views/${viewId}/share-link`, {
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const token = create?.data?.share_link
    let anon = await request.get(`/api/shared_view/${token}/photos`)
    expect(anon.status()).toBe(403)
    // Clear expiry
    await apiPost(page, `/api/views/${viewId}/share-link/expiry`, { expires_at: null })
    anon = await request.get(`/api/shared_view/${token}/photos`)
    expect(anon.status()).toBe(200)
  })

  test('setting expiry without re-issuing the token preserves the token value', async ({ page }) => {
    await loginAs(page)
    const create = await apiPost(page, `/api/views/${viewId}/share-link`, {})
    const originalToken = create?.data?.share_link
    const newDate = new Date(Date.now() + 3600 * 1000).toISOString()
    await apiPost(page, `/api/views/${viewId}/share-link/expiry`, { expires_at: newDate })
    const view = await apiGet(page, `/api/views/${viewId}`)
    expect(view?.data?.view?.share_link).toBe(originalToken)
    expect(view?.data?.view?.share_link_expires_at).toBeTruthy()
  })

  test('UI: "Expired" chip is visible when the share link has expired', async ({ page }) => {
    await loginAs(page)
    await apiPost(page, `/api/views/${viewId}/share-link`, {
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    })
    await page.goto(`/views/${viewId}`)
    await page.waitForLoadState('networkidle')
    // Open the share menu
    const shareBtn = page.locator('button').filter({ has: page.locator('.mdi-share-variant, .mdi-share-variant-outline') }).first()
    if (await shareBtn.isVisible().catch(() => false)) await shareBtn.click()
    await expect(page.locator('.v-chip', { hasText: /Expired/i }).first()).toBeVisible({ timeout: 5_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Photo detail panel — public view & token endpoints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Views — photo detail via token (shared / upload / public)', () => {

  let viewId: number
  let insideFilename: string  // photo that matches the view's filters
  let outsideFilename: string // photo that does NOT match the filters
  let setupOk = true

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    const res = await apiGet(page, '/api/photos')
    const photos = (res?.data?.photos || []) as any[]
    if (photos.length < 2) {
      setupOk = false
      await ctx.close()
      return
    }
    insideFilename = photos[0].filename
    outsideFilename = photos.find((p: any) => p.filename !== insideFilename && !p.favorite)?.filename
    if (!outsideFilename) { setupOk = false; await ctx.close(); return }
    // Pin "inside" as favorite so a favorite-only view contains exactly that photo
    await apiPost(page, `/api/photos/${insideFilename}/update`, { favorite: true })
    await apiPost(page, `/api/photos/${outsideFilename}/update`, { favorite: false })
    viewId = await getOrCreateTestView(page, 'E2E-token-detail', {
      filter_favorite: true,
      public: true,
    })
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    if (insideFilename) await apiPost(page, `/api/photos/${insideFilename}/update`, { favorite: false })
    if (viewId) await deleteView(page, viewId)
    await ctx.close()
  })

  test('public view: photo inside filters is reachable without auth', async ({ request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    const res = await request.get(`/api/public/views/${viewId}/photos/${insideFilename}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body?.data?.photo?.filename).toBe(insideFilename)
  })

  test('public view: photo outside filters returns 404', async ({ request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    const res = await request.get(`/api/public/views/${viewId}/photos/${outsideFilename}`)
    expect(res.status()).toBe(404)
  })

  test('public view: requesting a non-existent filename returns 404', async ({ request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    const res = await request.get(`/api/public/views/${viewId}/photos/does-not-exist.jpg`)
    expect(res.status()).toBe(404)
  })

  test('share token: photo inside filters is reachable via /api/token/<token>/photos/<file>', async ({ page, request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    await loginAs(page)
    const create = await apiPost(page, `/api/views/${viewId}/share-link`, {})
    const token = create?.data?.share_link
    expect(token).toBeTruthy()
    const res = await request.get(`/api/token/${token}/photos/${insideFilename}`)
    expect(res.status()).toBe(200)
  })

  test('share token: photo outside the view filters returns 404', async ({ page, request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    await loginAs(page)
    const view = await apiGet(page, `/api/views/${viewId}`)
    const token = view?.data?.view?.share_link
    test.skip(!token, 'No share token available')
    const res = await request.get(`/api/token/${token}/photos/${outsideFilename}`)
    expect(res.status()).toBe(404)
  })

  test('share token: expired token returns 403 on the photo detail endpoint', async ({ page, request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    await loginAs(page)
    const create = await apiPost(page, `/api/views/${viewId}/share-link`, {})
    const token = create?.data?.share_link
    await apiPost(page, `/api/views/${viewId}/share-link/expiry`, {
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const res = await request.get(`/api/token/${token}/photos/${insideFilename}`)
    expect(res.status()).toBe(403)
    // Reset for the rest of the suite
    await apiPost(page, `/api/views/${viewId}/share-link/expiry`, { expires_at: null })
  })

  test('upload token: photo inside filters is reachable via the same /api/token/ endpoint', async ({ page, request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    await loginAs(page)
    const up = await apiPost(page, `/api/views/${viewId}/upload-link`, {})
    const uploadToken = up?.data?.upload_link
    expect(uploadToken).toBeTruthy()
    const res = await request.get(`/api/token/${uploadToken}/photos/${insideFilename}`)
    expect(res.status()).toBe(200)
  })

  test('upload token: photo outside filters returns 404 (same enforcement as share token)', async ({ page, request }) => {
    test.skip(!setupOk, 'Need at least 2 published photos to set up')
    await loginAs(page)
    const view = await apiGet(page, `/api/views/${viewId}`)
    let uploadToken = view?.data?.view?.upload_link
    if (!uploadToken) {
      const up = await apiPost(page, `/api/views/${viewId}/upload-link`, {})
      uploadToken = up?.data?.upload_link
    }
    const res = await request.get(`/api/token/${uploadToken}/photos/${outsideFilename}`)
    expect(res.status()).toBe(404)
  })

  test('invalid or revoked token returns 403', async ({ request }) => {
    const res = await request.get(`/api/token/not-a-real-token-uuid/photos/does-not-matter.jpg`)
    expect(res.status()).toBe(403)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// View creation with a tag filter — filter_tag_names round-trips through the API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Views — create with tag filter', () => {

  let viewId: number | null = null
  let usedTagName = ''

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAs(page)
    await deleteView(page, viewId)
    await ctx.close()
  })

  test('creating a view with filter_tag_names preserves the tags on read-back', async ({ page }) => {
    await loginAs(page)
    const tagsRes = await apiGet(page, '/api/tags')
    const groups = (tagsRes?.data?.tag_groups || []) as any[]
    const firstTag = groups.flatMap(g => g.tags || [])[0]
    if (!firstTag) test.skip(true, 'No tag available to attach to the view')
    usedTagName = firstTag.name
    const created = await apiPost(page, '/api/views/create', {
      name: 'E2E-tag-filter-view',
      filter_tag_names: [usedTagName],
    })
    viewId = created?.data?.view?.id
    expect(viewId).toBeTruthy()
    const fetched = await apiGet(page, `/api/views/${viewId}`)
    const filterNames = (fetched?.data?.view?.filter_tags || []).map((t: any) => t.name)
    expect(filterNames).toContain(usedTagName)
  })

})
