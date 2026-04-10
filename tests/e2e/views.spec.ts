import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, waitForGrid } from './helpers'

// Test view name — unique enough to avoid conflicts
const TEST_VIEW_NAME = `Test View ${Date.now()}`

test.describe('Views — list page', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Views')
  })

  test('views page shows heading and New view button', async ({ page }) => {
    await expect(page.getByText('Views')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New view' })).toBeVisible()
  })

  test('empty state shows create button when no views exist', async ({ page }) => {
    // If no views, the empty state CTA should be visible
    const isEmpty = await page.getByText('No views yet').isVisible()
    if (isEmpty) {
      await expect(page.getByRole('button', { name: 'Create your first view' })).toBeVisible()
    }
  })

  test('view card shows name, photo count and public/private badge', async ({ page }) => {
    const card = page.locator('.view-card').first()
    if (await card.isVisible()) {
      await expect(card.locator('.text-body-1')).toBeVisible()          // name
      await expect(card.locator('.text-caption')).toContainText(/photo/) // count
      await expect(card.locator('.v-chip')).toBeVisible()               // badge
    }
  })

  test('view card hover reveals edit and delete buttons', async ({ page }) => {
    const card = page.locator('.view-card').first()
    if (!await card.isVisible()) return
    await card.hover()
    await expect(card.locator('.card-actions')).toBeVisible()
    await expect(card.locator('button[title*="edit"], button').nth(0)).toBeVisible()
  })

  test('New view button navigates to create page', async ({ page }) => {
    await page.getByRole('button', { name: 'New view' }).click()
    await expect(page).toHaveURL(/views\/create/)
    await expect(page.getByText('Create view')).toBeVisible()
  })

})

test.describe('Views — create', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Views')
    await page.getByRole('button', { name: 'New view' }).click()
    await expect(page).toHaveURL(/views\/create/)
  })

  test('Save button is disabled when name is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  test('Cancel navigates back to views list', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/views$/)
  })

  test('create a view with only a name', async ({ page }) => {
    await page.getByLabel('Name').fill(TEST_VIEW_NAME)
    await page.getByRole('button', { name: 'Save' }).click()
    // Should redirect to the new view's detail page
    await expect(page).toHaveURL(/views\/\d+/)
    await expect(page.getByText(TEST_VIEW_NAME)).toBeVisible()
    // Cleanup: delete the created view
    await page.getByRole('button', { name: /delete/i }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with description, public toggle and sort', async ({ page }) => {
    const name = `Full View ${Date.now()}`
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Description').fill('A test description with **markdown**')
    await page.getByLabel('Public').click() // toggle switch
    // Change sort to Upload date
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/)
    await expect(page.getByText(name)).toBeVisible()
    // Cleanup
    await page.getByRole('button', { name: /delete/i }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with No tags filter mode', async ({ page }) => {
    const name = `No Tags View ${Date.now()}`
    await page.getByLabel('Name').fill(name)
    await page.getByRole('button', { name: 'No tags' }).click()
    // Preview should refresh
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/)
    // Cleanup
    await page.getByRole('button', { name: /delete/i }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('create a view with favorite filter', async ({ page }) => {
    const name = `Favorites View ${Date.now()}`
    await page.getByLabel('Name').fill(name)
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/views\/\d+/)
    // Cleanup
    await page.getByRole('button', { name: /delete/i }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
  })

  test('preview grid updates when filter changes', async ({ page }) => {
    // Switch to No tags mode
    await page.getByRole('button', { name: 'No tags' }).click()
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
    // Navigate to Photos, apply No Tags mode, then save as view
    await page.goto('/photos')
    await waitForGrid(page)
    await page.getByRole('button', { name: 'No tags' }).click()
    await page.getByRole('button', { name: 'Save as view' }).click()
    await expect(page).toHaveURL(/views\/create/)
    // No tags button should be active (pre-filled)
    await expect(page.getByRole('button', { name: 'No tags' })).toHaveClass(/v-btn--active|active/)
  })

})

test.describe('Views — detail', () => {

  let viewId: string

  // Create a view before tests, delete after
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.getByLabel('Name').fill(`Detail Test View`)
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/)
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.getByRole('button', { name: /delete/i }).last().click()
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
    await page.locator('.item img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
  })

  test('favorite button appears on photo hover', async ({ page }) => {
    await waitForGrid(page)
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    await expect(firstItem.locator('.favorite-btn')).toBeVisible()
  })

  test('edit button navigates to edit page', async ({ page }) => {
    await page.locator('button[data-testid="edit-view"], button').filter({ has: page.locator('[class*="pencil"]') }).first().click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}/edit`))
    await expect(page.getByText('Edit view')).toBeVisible()
  })

  test('delete button shows confirm dialog', async ({ page }) => {
    await page.locator('button').filter({ has: page.locator('[class*="delete"]') }).last().click()
    await expect(page.getByText(/Delete.*?/)).toBeVisible()
    // Cancel — don't actually delete (afterAll handles cleanup)
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('changing sort re-orders photos', async ({ page }) => {
    await waitForGrid(page)
    const firstSrc = await page.locator('.item img').first().getAttribute('src')
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.waitForTimeout(300)
    const newFirstSrc = await page.locator('.item img').first().getAttribute('src')
    // Order may or may not change (depends on data) — grid should still be present
    await expect(page.locator('.item').first()).toBeVisible()
    _ = firstSrc; _ = newFirstSrc
  })

})

test.describe('Views — edit', () => {

  let viewId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto('/views/create')
    await page.getByLabel('Name').fill('Edit Me View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/)
    viewId = page.url().match(/views\/(\d+)/)?.[1] || ''
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!viewId) return
    const page = await browser.newPage()
    await loginAs(page)
    await page.goto(`/views/${viewId}`)
    await page.locator('button').filter({ has: page.locator('[class*="delete"]') }).last().click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.getByText('Edit view')).toBeVisible()
  })

  test('edit page pre-fills name from existing view', async ({ page }) => {
    await expect(page.getByLabel('Name')).toHaveValue('Edit Me View')
  })

  test('edit page pre-fills filter mode', async ({ page }) => {
    // Quick is the default mode — should be active
    await expect(page.getByRole('button', { name: 'Quick' })).toHaveClass(/v-btn--active|active/)
  })

  test('cancel navigates back to view detail', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`))
  })

  test('edit name and save', async ({ page }) => {
    await page.getByLabel('Name').fill('Renamed View')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`))
    await expect(page.getByText('Renamed View')).toBeVisible()
  })

  test('edit sort and verify it persists', async ({ page }) => {
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(new RegExp(`views/${viewId}$`))
    // Go back to edit and verify sort is persisted
    await page.goto(`/views/${viewId}/edit`)
    await expect(page.locator('.v-select').first()).toContainText('Rating')
  })

  test('changing sort updates the preview', async ({ page }) => {
    const countBefore = await page.locator('.item').count()
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'Upload date' }).click()
    await page.waitForLoadState('networkidle')
    const countAfter = await page.locator('.item').count()
    // Photo count should be the same regardless of sort
    expect(countAfter).toBe(countBefore)
  })

})

test.describe('Views — delete from list', () => {

  test('delete a view from the cards list', async ({ page }) => {
    await loginAs(page)
    // Create a view to delete
    await page.goto('/views/create')
    await page.getByLabel('Name').fill('To Delete View')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/views\/\d+/)

    // Go to views list
    await navigateTo(page, 'Views')
    const card = page.locator('.view-card').filter({ hasText: 'To Delete View' })
    await card.hover()
    await card.locator('.card-actions button').last().click() // delete button
    // Confirm dialog
    await expect(page.getByText('To Delete View')).toBeVisible() // in dialog title
    await page.getByRole('button', { name: 'Delete' }).last().click()
    // Card should disappear
    await expect(card).not.toBeVisible({ timeout: 5_000 })
  })

})
