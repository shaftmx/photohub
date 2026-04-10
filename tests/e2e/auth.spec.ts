import { test, expect } from '@playwright/test'
import { loginAs, TEST_USER, TEST_PASSWORD } from './helpers'

test.describe('Authentication', () => {

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/photos')
    await expect(page).toHaveURL(/login/)
  })

  test('login with valid credentials', async ({ page }) => {
    await loginAs(page)
    // Should land somewhere other than login
    await expect(page).not.toHaveURL(/login/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username', { exact: true }).fill(TEST_USER)
    await page.getByLabel('Password', { exact: true }).fill('wrong-password')
    await page.getByRole('button', { name: 'Login' }).click()
    // Should stay on login page
    await expect(page).toHaveURL(/login/)
  })

  test('logout redirects to login', async ({ page }) => {
    await loginAs(page)
    await page.locator('.v-app-bar-nav-icon').click()
    await page.locator('.v-list-item').filter({ hasText: 'Logout' }).click()
    await expect(page).toHaveURL(/login/)
  })

})
