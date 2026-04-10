import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, FIXTURE_PHOTO, FIXTURE_PHOTO_2, gridItems, waitForGrid } from './helpers'

test.describe('Upload', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Upload')
  })

  test('upload page is accessible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Upload files' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled()
  })

  test('upload a single JPEG file', async ({ page }) => {
    await page.getByLabel('File input').setInputFiles(FIXTURE_PHOTO)
    await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled()
    await page.getByRole('button', { name: 'Upload' }).click()
    // Success alert should appear
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 15_000 })
    // Uploaded file appears in the list
    await expect(page.getByText('test-photo.jpg')).toBeVisible()
  })

  test('upload button navigates to Unpublished', async ({ page }) => {
    await page.getByLabel('File input').setInputFiles(FIXTURE_PHOTO)
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 15_000 })
    // Navigate to unpublished via the arrow button that appears
    await page.getByRole('button', { name: /tag/i }).click()
    await expect(page).toHaveURL(/unpublished/)
  })

  test('upload multiple files at once', async ({ page }) => {
    await page.getByLabel('File input').setInputFiles([FIXTURE_PHOTO, FIXTURE_PHOTO_2])
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 20_000 })
  })

})

test.describe('Unpublished', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Unpublished')
  })

  test('unpublished page shows heading and photos', async ({ page }) => {
    await expect(page.getByText('Unpublished')).toBeVisible()
    await expect(page.getByText(/All recently uploaded photos/)).toBeVisible()
  })

  test('select a photo and publish it', async ({ page }) => {
    await waitForGrid(page)
    const firstPhoto = page.locator('.item').first()
    await firstPhoto.click()
    await expect(page.getByText(/1 selected/)).toBeVisible()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Publish' }).click()
    // Confirm dialog
    await page.getByRole('button', { name: 'Publish' }).last().click()
    // Photo should disappear from unpublished
    await expect(firstPhoto).not.toBeVisible({ timeout: 5_000 })
  })

  test('select all and publish', async ({ page }) => {
    await waitForGrid(page)
    const initialCount = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Select all' }).click()
    await expect(page.getByText(new RegExp(`${initialCount} selected`))).toBeVisible()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Publish' }).click()
    await page.getByRole('button', { name: 'Publish' }).last().click()
    await expect(page.locator('.item')).toHaveCount(0, { timeout: 10_000 })
  })

  test('select all then deselect all', async ({ page }) => {
    await waitForGrid(page)
    await page.getByRole('button', { name: 'Select all' }).click()
    await page.getByRole('button', { name: 'Deselect all' }).click()
    await expect(page.getByText(/0 selected/)).not.toBeVisible()
  })

  test('delete an unpublished photo', async ({ page }) => {
    await waitForGrid(page)
    const firstPhoto = page.locator('.item').first()
    await firstPhoto.click()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await expect(firstPhoto).not.toBeVisible({ timeout: 5_000 })
  })

  test('open photo detail from unpublished', async ({ page }) => {
    await waitForGrid(page)
    // Hover to reveal the detail button then click it
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    await firstItem.locator('button').filter({ hasText: /info|details/i }).click()
    // Detail panel should open
    await expect(page.locator('[data-testid="photo-detail"], .photo-detail, .v-navigation-drawer')).toBeVisible({ timeout: 5_000 })
  })

})
