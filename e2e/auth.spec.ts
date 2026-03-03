/**
 * E2E — Authentication flows
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers:
 *  ✅  Happy path: login redirects to /dashboard
 *  ✅  Error path: wrong credentials shows error message
 *  ✅  Register: creates account, shows confirmation message
 *  ✅  Logout: clears session, redirects to /login
 *  🔁  Regression BUG-13: signOut network failure still clears local state
 *  ✅  Redirect: unauthenticated user going to /dashboard → /login
 *  ✅  Post-login redirect: ?redirect param is honoured after login
 */

import { test, expect } from '@playwright/test'
import { mockAuth } from './helpers/supabase-mock'
import { MOCK_SESSION, MOCK_USER } from './helpers/fixtures'

// ─── Happy path: login ────────────────────────────────────────────────────────

test('login: valid credentials redirect to /dashboard', async ({ page }) => {
  // injectStorage:false so the /login page is shown (not immediately redirected)
  await mockAuth(page, { session: MOCK_SESSION, injectStorage: false })
  await page.goto('/login')

  await page.getByLabel(/email/i).fill(MOCK_USER.email)
  await page.getByLabel(/contraseña/i).fill('password123')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  await expect(page).toHaveURL(/\/dashboard/)
})

// ─── Error path: wrong credentials ───────────────────────────────────────────

test('login: invalid credentials shows error message', async ({ page }) => {
  await mockAuth(page, { signInError: 'Invalid login credentials' })
  await page.goto('/login')

  await page.getByLabel(/email/i).fill('wrong@example.com')
  await page.getByLabel(/contraseña/i).fill('badpassword')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  // Error banner should appear — stays on /login
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

// ─── Guard: submit with empty fields ─────────────────────────────────────────

test('login: empty form does not navigate', async ({ page }) => {
  await page.goto('/login')
  // Try submitting without filling anything
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await expect(page).toHaveURL(/\/login/)
})

// ─── Register flow ────────────────────────────────────────────────────────────

test('register: successful signup shows confirmation message', async ({ page }) => {
  // signUp returns no session (email confirmation required)
  await mockAuth(page, { session: null })
  await page.goto('/login')

  // Switch to register mode — the link text is "Regístrate gratis"
  await page.getByRole('button', { name: /regístrate gratis/i }).click()

  await page.getByLabel(/nombre/i).fill('Test User')
  await page.getByLabel(/email/i).fill('new@recuerdos.app')
  await page.getByLabel(/contraseña/i).fill('secure123')
  // The submit button in register mode says "Crear cuenta"
  await page.getByRole('button', { name: /^crear cuenta$/i }).click()

  // Should show "revisa tu correo" confirmation and switch back to login mode
  await expect(page.getByText(/revisa tu correo/i)).toBeVisible()
})

test('register: server error shows error banner', async ({ page }) => {
  await mockAuth(page, { signUpError: 'Email already registered' })
  await page.goto('/login')

  // Switch to register mode — the link text is "Regístrate gratis"
  await page.getByRole('button', { name: /regístrate gratis/i }).click()

  await page.getByLabel(/nombre/i).fill('Dupe User')
  await page.getByLabel(/email/i).fill('dupe@recuerdos.app')
  await page.getByLabel(/contraseña/i).fill('secure123')
  // The submit button in register mode says "Crear cuenta"
  await page.getByRole('button', { name: /^crear cuenta$/i }).click()

  await expect(page.getByText(/email already registered/i)).toBeVisible()
})

// ─── Redirect guard ───────────────────────────────────────────────────────────

test('unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
  // No session — mock returns null
  await mockAuth(page, { session: null })
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('login redirects back to the ?redirect param', async ({ page }) => {
  // injectStorage:false — test submits credentials from /login manually
  await mockAuth(page, { session: MOCK_SESSION, injectStorage: false })
  // Simulate coming from the invite acceptance page
  await page.goto('/login?redirect=/invite/some-token')

  await page.getByLabel(/email/i).fill(MOCK_USER.email)
  await page.getByLabel(/contraseña/i).fill('password123')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  await expect(page).toHaveURL(/\/invite\/some-token/)
})

// ─── Logout ───────────────────────────────────────────────────────────────────

test('logout: clears session and redirects to /login', async ({ page }) => {
  await mockAuth(page, { session: MOCK_SESSION })
  // Mock the tables needed to render the dashboard
  await page.route('**/rest/v1/memories**',   (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/categories**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/photos**',     (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard')

  // Find and click the logout button (inside sidebar / settings)
  await page.getByRole('button', { name: /cerrar sesión|salir|logout/i }).click()

  await expect(page).toHaveURL(/\/login/)
})

// ─── BUG-13 regression ────────────────────────────────────────────────────────
// signOut should clear local state even when the Supabase network call fails.

test('BUG-13 regression: signOut network failure still clears local UI state', async ({ page }) => {
  await mockAuth(page, { session: MOCK_SESSION })
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard')

  // Make POST /auth/v1/logout fail with a network error
  await page.route('**/auth/v1/logout', (route) => route.abort('failed'))

  // Click logout — should still navigate away even if Supabase call errored
  await page.getByRole('button', { name: /cerrar sesión|salir|logout/i }).click()

  // App must redirect to /login regardless of the network failure
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
})
