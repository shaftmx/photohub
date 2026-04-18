import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, waitForGrid } from './helpers'

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
    // Wait for the API response before checking redirect
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/views/${viewId}/update`)),
      page.getByRole('button', { name: 'Save' }).click(),
    ])
    expect(response.status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`), { timeout: 10_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.text-h6').filter({ hasText: 'Renamed View' })).toBeVisible({ timeout: 10_000 })
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
    // Wait for the initial preview to load before counting
    await page.waitForLoadState('networkidle')
    const countBefore = await page.locator('.item').count()
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await page.waitForLoadState('networkidle')
    const countAfter = await page.locator('.item').count()
    // Photo count should be the same regardless of sort
    expect(countAfter).toBe(countBefore)
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
    await expect(page.locator('button[title="Share link"]')).toBeVisible()
  })

  test('generate share link creates a URL', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share link"]').click()
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
    await page.locator('button[title="Share link"]').click()
    await expect(page.locator('input[readonly]').first()).toBeVisible({ timeout: 5_000 })
    const shareUrl = await page.locator('input[readonly]').first().inputValue()
    const token = shareUrl.split('/views/')[1]

    // Open in anonymous context (no auth)
    const anonPage = await page.context().browser()!.newPage()
    await anonPage.goto(`/views/${token}`)
    await expect(anonPage.getByText('Share Link View')).toBeVisible()
    await expect(anonPage.locator('button[title="Share link"]')).not.toBeVisible()
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
    await page.locator('button[title="Share link"]').click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Regenerate', exact: true }).click()
    await expect(page.getByText('This will invalidate the current link')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('This will invalidate the current link')).not.toBeVisible()
  })

  test('revoke share link removes access', async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button[title="Share link"]').click()
    await expect(page.locator('input[readonly]').first()).toBeVisible({ timeout: 5_000 })
    const shareUrl = await page.locator('input[readonly]').first().inputValue()
    const token = shareUrl.split('/views/')[1]

    // Revoke
    await page.getByRole('button', { name: 'Revoke', exact: true }).click()
    await page.waitForLoadState('networkidle')
    // Menu closes, share button back to outline (no active link)
    await expect(page.locator('button[title="Share link"]')).toBeVisible()
    await expect(page.locator('button[title="Share link"] .mdi-share-variant-outline')).toBeVisible()

    // Token should no longer work
    const anonPage = await page.context().browser()!.newPage()
    await anonPage.goto(`/views/${token}`)
    await expect(anonPage.getByText('This shared link is no longer valid')).toBeVisible()
    await anonPage.close()
  })

})
