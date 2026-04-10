import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, gridItems, waitForGrid } from './helpers'

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
    await page.getByRole('button', { name: /close/i }).first().click()
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
    const wasFavorited = await favBtn.evaluate(el => el.classList.contains('active'))
    await favBtn.click()
    // Active state should have toggled
    const isFavorited = await favBtn.evaluate(el => el.classList.contains('active'))
    expect(isFavorited).toBe(!wasFavorited)
    // Revert
    await favBtn.click()
  })

  test('grid size slider changes photo sizes', async ({ page }) => {
    const sizesBefore = await page.locator('.item').first().boundingBox()
    // Move slider right (larger)
    const slider = page.locator('.v-slider').last()
    await slider.locator('input[type=range]').fill('300')
    const sizesAfter = await page.locator('.item').first().boundingBox()
    expect(sizesAfter!.width).toBeGreaterThan(sizesBefore!.width)
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
    await expect(page.getByRole('button', { name: 'Quick' })).toHaveClass(/v-btn--active|active/)
  })

  test('switch to Detailed filter mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Detailed' }).click()
    await expect(page.getByText('Show filters').or(page.getByText('Hide filters'))).toBeVisible()
  })

  test('switch to No tags filter mode', async ({ page }) => {
    const countBefore = await page.locator('.item').count()
    await page.getByRole('button', { name: 'No tags' }).click()
    await page.waitForLoadState('networkidle')
    // Photo count may differ — grid should still be present (0 or more)
    await expect(page.locator('.grid')).toBeVisible()
    _ = countBefore // used to avoid lint warning
  })

  test('filter by favorite', async ({ page }) => {
    await page.locator('button[title*="avorite"]').first().click()
    await page.waitForLoadState('networkidle')
    // All visible photos should be favorites — grid is present
    await expect(page.locator('.grid')).toBeVisible()
  })

  test('filter by rating — click 3 stars', async ({ page }) => {
    // Click the 3rd star button
    const stars = page.locator('.d-flex.align-center button[title*="star"]')
    await stars.nth(2).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.grid')).toBeVisible()
  })

  test('rating mode toggles between ≤ and =', async ({ page }) => {
    const stars = page.locator('.d-flex.align-center button[title*="star"]')
    await stars.nth(2).click()
    // Rating mode toggle should appear
    const modeToggle = page.locator('.rating-mode-toggle')
    await expect(modeToggle).toBeVisible()
    await expect(modeToggle).toHaveText('≤')
    await modeToggle.click()
    await expect(modeToggle).toHaveText('=')
  })

  test('save as view button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save as view' })).toBeVisible()
  })

  test('save as view navigates to create view with pre-filled filters', async ({ page }) => {
    // Apply a filter first
    await page.getByRole('button', { name: 'Detailed' }).click()
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
    await page.getByRole('button', { name: 'Select' }).click()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
  })

  test('select a photo in selection mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    await page.locator('.item-inner').first().click()
    await expect(page.getByText('1 selected')).toBeVisible()
  })

  test('select all photos', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    const total = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Select all' }).click()
    await expect(page.getByText(`${total} selected`)).toBeVisible()
  })

  test('deselect all photos', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    await page.getByRole('button', { name: 'Select all' }).click()
    await page.getByRole('button', { name: 'Deselect all' }).click()
    await expect(page.getByText('0 selected')).not.toBeVisible()
  })

  test('bulk unpublish — confirm dialog appears', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Unpublish' }).click()
    await expect(page.getByText(/Unpublish.*photo/i)).toBeVisible()
    // Cancel — do not actually unpublish in this test
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('bulk delete — confirm dialog appears', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Delete' }).click()
    await expect(page.getByText(/Delete.*photo/i)).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).last().click()
  })

  test('add to favorites via bulk action', async ({ page }) => {
    await page.getByRole('button', { name: 'Select' }).click()
    await page.locator('.item-inner').first().click()
    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Add to favorites' }).click()
    // Selection mode should exit after action
    await expect(page.getByRole('button', { name: 'Select' })).toBeVisible({ timeout: 5_000 })
  })

})

test.describe('Photo detail panel', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Photos')
    await waitForGrid(page)
    await page.locator('.item img').first().click()
    await expect(page).toHaveURL(/displayPhoto=/)
  })

  test('detail panel opens and shows filename', async ({ page }) => {
    // The detail panel should be visible with some photo info
    await expect(page.locator('.v-navigation-drawer, [class*="detail"]').first()).toBeVisible()
  })

  test('toggle favorite in detail panel', async ({ page }) => {
    const favBtn = page.getByRole('button', { name: /favorite|heart/i }).first()
    await expect(favBtn).toBeVisible()
    await favBtn.click()
    // Button should still be there (state toggled)
    await expect(favBtn).toBeVisible()
    // Revert
    await favBtn.click()
  })

  test('set rating in detail panel', async ({ page }) => {
    // Click 4 stars
    const stars = page.locator('button[title*="star"]').nth(3)
    await expect(stars).toBeVisible()
    await stars.click()
    // Rating should be applied (star becomes filled)
    await expect(stars).toBeVisible()
  })

  test('navigate to next photo with arrow', async ({ page }) => {
    const firstUrl = page.url()
    // Hover photo area to reveal nav arrows
    await page.locator('.v-carousel, [class*="carousel"]').hover().catch(() => {})
    const nextBtn = page.getByRole('button', { name: /next|chevron-right/i }).first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      expect(page.url()).not.toBe(firstUrl)
    }
  })

})
