import { Page, expect } from '@playwright/test'
import path from 'path'

// ---
// Credentials — override via env vars in CI
// ---
export const TEST_USER = process.env.TEST_USER || 'admin'
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin'

// Small fixture JPEG placed in tests/fixtures/
export const FIXTURE_PHOTO = path.join(__dirname, '../fixtures/test-photo.jpg')
export const FIXTURE_PHOTO_2 = path.join(__dirname, '../fixtures/test-photo-2.jpg')

// ---
// Auth helpers
// ---

/** Log in via the login form and wait for navigation to complete. */
export async function loginAs(page: Page, username = TEST_USER, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  // After login we end up on Home
  await expect(page).toHaveURL(/\/$|\/home|#\/$/)
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
