import { test, expect } from '@playwright/test'
import { loginAs, logout, openNavMenu } from './helpers'

// ---------------------------------------------------------------------------
// Home page — authenticated
// ---------------------------------------------------------------------------

test.describe('Home — authenticated', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('shows gallery grid when views exist', async ({ page }) => {
    const isEmpty = await page.getByText('No views yet').isVisible()
    if (!isEmpty) {
      await expect(page.locator('.gallery-card').first()).toBeVisible()
    }
  })

  test('gallery card shows name overlay', async ({ page }) => {
    const card = page.locator('.gallery-card').first()
    if (!await card.isVisible()) return
    await expect(card.locator('.cover-name')).toBeVisible()
  })

  test('gallery card click navigates to view detail', async ({ page }) => {
    const card = page.locator('.gallery-card').first()
    if (!await card.isVisible()) return
    await card.click()
    await expect(page).toHaveURL(/\/views\/\d+/)
  })

  test('empty state shows "Create your first view" when no views', async ({ page }) => {
    const isEmpty = await page.getByText('No views yet').isVisible()
    if (isEmpty) {
      await expect(page.getByRole('button', { name: 'Create your first view' })).toBeVisible()
    }
  })

})

// ---------------------------------------------------------------------------
// Home page — unauthenticated (public access)
// ---------------------------------------------------------------------------

test.describe('Home — unauthenticated', () => {

  test('home page loads without login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Should not be redirected to login
    await expect(page).not.toHaveURL(/login/)
  })

  test('no "New view" button visible when not logged in', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'New view' })).not.toBeVisible()
  })

  test('public views are visible without authentication', async ({ page }) => {
    // First confirm there is at least one public view (via a logged-in check)
    const authPage = await page.context().browser()!.newPage()
    await loginAs(authPage)
    await authPage.goto('/')
    await authPage.waitForLoadState('networkidle')
    // Filter to cards without a lock icon — those are public views
    const hasPublic = await authPage.locator('.gallery-card').filter({ hasNot: authPage.locator('i.mdi-lock') }).first().isVisible({ timeout: 3_000 }).catch(() => false)
    await authPage.close()
    if (!hasPublic) return

    // Unauthenticated visit — public views should appear
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.gallery-card').first()).toBeVisible()
  })

})

// ---------------------------------------------------------------------------
// AppBar — logo
// ---------------------------------------------------------------------------

test.describe('AppBar — logo', () => {

  test('logo click navigates to home from another page', async ({ page }) => {
    await loginAs(page)
    await page.goto('/photos')
    await page.waitForLoadState('networkidle')
    await page.locator('.logo-link').click()
    await expect(page).toHaveURL(/\/$|\/home/)
  })

})

// ---------------------------------------------------------------------------
// AppBar — unauthenticated menu
// ---------------------------------------------------------------------------

test.describe('AppBar — unauthenticated menu', () => {

  test('menu shows Login item when not logged in', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v-app-bar-nav-icon').click()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Login' })).toBeVisible()
  })

  test('menu hides auth-only items when not logged in', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v-app-bar-nav-icon').click()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Upload' })).not.toBeVisible()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Photos' })).not.toBeVisible()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Logout' })).not.toBeVisible()
  })

  test('Login item in menu navigates to login page', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v-app-bar-nav-icon').click()
    await page.locator('.v-list-item').filter({ hasText: 'Login' }).click()
    await expect(page).toHaveURL(/login/)
  })

})

// ---------------------------------------------------------------------------
// AppBar — authenticated menu
// ---------------------------------------------------------------------------

test.describe('AppBar — authenticated menu', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('menu shows username when logged in', async ({ page }) => {
    await page.locator('.v-app-bar-nav-icon').click()
    // Username row is visible (account-circle icon + username text)
    await expect(page.locator('.v-list-item').filter({ has: page.locator('.mdi-account-circle') })).toBeVisible()
  })

  test('menu shows all auth items when logged in', async ({ page }) => {
    await page.locator('.v-app-bar-nav-icon').click()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Photos' })).toBeVisible()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Views' })).toBeVisible()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Upload' })).toBeVisible()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Logout' })).toBeVisible()
  })

  test('menu does not show Login item when logged in', async ({ page }) => {
    await page.locator('.v-app-bar-nav-icon').click()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Login' })).not.toBeVisible()
  })

  test('dark theme toggle is visible in menu', async ({ page }) => {
    await page.locator('.v-app-bar-nav-icon').click()
    await expect(page.locator('.v-list-item').filter({ hasText: 'Dark theme' })).toBeVisible()
  })

})
