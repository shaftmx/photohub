import { test, expect } from '@playwright/test'
import { loginAs, navigateTo, FIXTURE_PHOTO, FIXTURE_PHOTO_2, waitForGrid } from './helpers'

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
    await page.getByLabel('File input', { exact: true }).setInputFiles(FIXTURE_PHOTO)
    await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled()
    await page.getByRole('button', { name: 'Upload' }).click()
    // Success alert should appear
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 15_000 })
    // Uploaded file appears in the list
    await expect(page.getByText('test-photo.jpg')).toBeVisible()
  })

  test('upload button navigates to Unpublished', async ({ page }) => {
    await page.getByLabel('File input', { exact: true }).setInputFiles(FIXTURE_PHOTO)
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 15_000 })
    // Navigate to unpublished via the icon button that appears after upload
    await page.locator('button .mdi-tag-arrow-right-outline').click()
    await expect(page).toHaveURL(/unpublished/)
  })

  test('upload multiple files at once', async ({ page }) => {
    await page.getByLabel('File input', { exact: true }).setInputFiles([FIXTURE_PHOTO, FIXTURE_PHOTO_2])
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 20_000 })
  })

})

test.describe('Unpublished', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await navigateTo(page, 'Unpublished')
  })

  // Non-destructive tests first
  test('unpublished page shows heading and photos', async ({ page }) => {
    await expect(page.getByText('Unpublished')).toBeVisible()
    await expect(page.getByText(/All recently uploaded photos/)).toBeVisible()
  })

  test('select all then deselect all', async ({ page }) => {
    await waitForGrid(page)
    // exact: true avoids matching "Deselect all" (which contains "Select all" as substring)
    await page.getByRole('button', { name: 'Select all', exact: true }).click()
    await page.getByRole('button', { name: 'Deselect all', exact: true }).click()
  })

  test('open photo detail from unpublished', async ({ page }) => {
    await waitForGrid(page)
    // Hover to reveal the detail button (title="Details", icon-only)
    const firstItem = page.locator('.item-inner').first()
    await firstItem.hover()
    await firstItem.locator('button[title="Details"]').click()
    // Detail panel (v-navigation-drawer) should open
    await expect(page.locator('.v-navigation-drawer')).toBeVisible({ timeout: 5_000 })
  })

  // Destructive tests last — each removes photos from the unpublished queue
  test('select a photo and publish it', async ({ page }) => {
    await waitForGrid(page)
    const countBefore = await page.locator('.item').count()
    await page.locator('.item').first().click()
    await expect(page.getByText(/1 selected/)).toBeVisible()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Publish' }).click()
    // Confirm dialog
    await page.getByRole('button', { name: 'Publish' }).last().click()
    // One photo should have left the unpublished list
    await expect(page.locator('.item')).toHaveCount(countBefore - 1, { timeout: 8_000 })
  })

  test('delete an unpublished photo', async ({ page }) => {
    await waitForGrid(page)
    const countBefore = await page.locator('.item').count()
    await page.locator('.item').first().click()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await expect(page.locator('.item')).toHaveCount(countBefore - 1, { timeout: 8_000 })
  })

  test('select all and publish', async ({ page }) => {
    // Upload fresh photos first so the queue is guaranteed non-empty
    await navigateTo(page, 'Upload')
    await page.getByLabel('File input', { exact: true }).setInputFiles([FIXTURE_PHOTO, FIXTURE_PHOTO_2])
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.getByText('All files uploaded')).toBeVisible({ timeout: 15_000 })
    await navigateTo(page, 'Unpublished')

    await waitForGrid(page)
    const initialCount = await page.locator('.item').count()
    await page.getByRole('button', { name: 'Select all', exact: true }).click()
    await expect(page.getByText(new RegExp(`${initialCount} selected`))).toBeVisible()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.v-list-item').filter({ hasText: /^Publish$/ }).click()
    await page.getByRole('button', { name: 'Publish' }).last().click()
    await expect(page.locator('.item')).toHaveCount(0, { timeout: 10_000 })
  })

})
