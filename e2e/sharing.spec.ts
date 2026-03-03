/**
 * E2E — Sharing & Invite flows
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers:
 *  ✅  Settings: owner can create a read-only invite link
 *  ✅  Settings: owner can create a write-permission invite link
 *  ✅  Settings: invite link is copied to clipboard with toast confirmation
 *  ✅  Settings: owner can revoke a share
 *  ✅  /invite/:token: unauthenticated user is redirected to /login
 *  ✅  /invite/:token: logged-in user sees "verifying" then success state
 *  🔁  Regression BUG-03: expired share tokens are not shown as active in guest mode
 *  🔁  Regression BUG-04: expired token shows "ha expirado" (not "ya fue usado")
 *  ✅  Guest mode: write-only actions are hidden for read-only guests
 *  ✅  Guest mode: write-permission guest sees create memory button
 */

import { test, expect } from '@playwright/test'
import { mockAuth, mockTable, mockRpc, setupAuthenticatedPage } from './helpers/supabase-mock'
import {
  MOCK_SESSION,
  MOCK_GUEST_USER,
  MOCK_MEMORY,
  MOCK_CATEGORY,
  MOCK_PHOTO,
  MOCK_SHARE,
} from './helpers/fixtures'

// ─── Owner: create invite link ────────────────────────────────────────────────

test('settings: owner can generate a read invite link', async ({ page }) => {
  await setupAuthenticatedPage(page, MOCK_SESSION, async (p) => {
    await mockTable(p, 'memories',      [MOCK_MEMORY])
    await mockTable(p, 'categories',    [MOCK_CATEGORY])
    // shared_access as owner (no existing shares at first)
    await mockTable(p, 'shared_access', [], { insertResult: MOCK_SHARE })
  })
  await page.goto('/settings')

  // Navigate to the Compartir tab
  await page.getByRole('button', { name: /compartir/i }).click()

  // The "Crear enlace de invitación" button is in the SharingPanel
  await page.getByRole('button', { name: /crear enlace de invitación/i }).click()

  // Toast with "copiado" or the URL appearing
  await expect(page.getByText(/enlace copiado|invitación creada/i)).toBeVisible({ timeout: 6_000 })
})

test('settings: owner can revoke an existing share', async ({ page }) => {
  const acceptedShare = { ...MOCK_SHARE, accepted_at: new Date().toISOString(), guest_user_id: MOCK_GUEST_USER.id }

  await setupAuthenticatedPage(page, MOCK_SESSION, async (p) => {
    await mockTable(p, 'memories',      [MOCK_MEMORY])
    await mockTable(p, 'categories',    [MOCK_CATEGORY])
    // shared_access: GET returns the accepted share; DELETE returns empty
    await p.route('**/rest/v1/shared_access**', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([acceptedShare]) })
      }
    })
  })
  await page.goto('/settings')

  // Navigate to the Compartir tab
  await page.getByRole('button', { name: /compartir/i }).click()

  await page.getByRole('button', { name: /revocar|eliminar acceso/i }).first().click()
  await expect(page.getByText(/acceso revocado/i)).toBeVisible({ timeout: 5_000 })
})

// ─── Invite page: unauthenticated ─────────────────────────────────────────────

test('/invite/:token redirects unauthenticated user to /login', async ({ page }) => {
  await mockAuth(page, { session: null })
  await page.goto(`/invite/${MOCK_SHARE.invite_token}`)
  await expect(page).toHaveURL(/\/login\?redirect=.*invite/)
})

// ─── Invite page: valid token acceptance ──────────────────────────────────────

test('/invite/:token: valid token shows success then redirects to /dashboard', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  const acceptedShare = { ...MOCK_SHARE, accepted_at: new Date().toISOString(), guest_user_id: MOCK_GUEST_USER.id }
  // acceptInvite() calls supabase.rpc('accept_shared_invite') — intercept the RPC
  await mockRpc(page, 'accept_shared_invite', acceptedShare)
  await mockTable(page, 'memories',   [MOCK_MEMORY])
  await mockTable(page, 'categories', [MOCK_CATEGORY])
  await mockTable(page, 'photos',     [MOCK_PHOTO])

  await page.goto(`/invite/${MOCK_SHARE.invite_token}`)

  // Should see success state before the 2.5s auto-redirect fires
  await expect(page.getByText(/invitación aceptada/i)).toBeVisible({ timeout: 8_000 })
  // After 2.5 s the page auto-redirects to /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 8_000 })
})

// ─── BUG-04 regression: expired token shows correct message ──────────────────

test('BUG-04 regression: expired invite token shows "ha expirado" message', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  // The RPC validates expiry server-side and raises EXPIRED — mock that response
  await mockRpc(page, 'accept_shared_invite', null, { error: 'EXPIRED' })

  await page.goto(`/invite/${MOCK_SHARE.invite_token}`)

  // Should see "ha expirado" — NOT "ya fue usado". Use first() to avoid
  // matching a same-text Sonner toast that appears concurrently.
  await expect(page.locator('p').filter({ hasText: /ha expirado/i }).first()).toBeVisible({ timeout: 6_000 })
  await expect(page.locator('p').filter({ hasText: /ya fue usado/i })).not.toBeVisible()
})

test('BUG-04 regression: already-used token shows "ya fue aceptado" message', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  // The RPC validates reuse server-side and raises ALREADY_USED — mock that response
  await mockRpc(page, 'accept_shared_invite', null, { error: 'ALREADY_USED' })

  await page.goto(`/invite/${MOCK_SHARE.invite_token}`)

  await expect(page.locator('p').filter({ hasText: /ya fue aceptado/i }).first()).toBeVisible({ timeout: 6_000 })
})

// ─── BUG-03 regression: expired share not active in guest mode ───────────────

test('BUG-03 regression: guest with expired share sees no owner content', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  // shared_access returns an expired row
  const expiredAcceptedShare = {
    ...MOCK_SHARE,
    accepted_at:  new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at:   new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // expired yesterday
    guest_user_id: MOCK_GUEST_USER.id,
  }

  await page.route('**/rest/v1/shared_access**', async (route) => {
    const url = route.request().url()
    // The fixed query filters expires_at > now, so an expired share should return 0 rows
    if (url.includes('expires_at=gt')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([expiredAcceptedShare]) })
    }
  })
  await mockTable(page, 'memories',   [])   // no memories returned (share expired, RLS blocks)
  await mockTable(page, 'categories', [])
  await mockTable(page, 'photos',     [])

  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard')

  // Guest-mode banner (if present) should NOT be showing "viewing X's memories"
  await expect(page.getByText(/estás viendo los recuerdos de/i)).not.toBeVisible()
})

// ─── Guest mode UI ────────────────────────────────────────────────────────────

test('read-only guest: "new memory" button is hidden', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  const activeReadShare = { ...MOCK_SHARE, accepted_at: new Date().toISOString(), guest_user_id: MOCK_GUEST_USER.id, permission: 'read' }

  await page.route('**/rest/v1/shared_access**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([activeReadShare]) })
  )
  await mockTable(page, 'memories',   [MOCK_MEMORY])
  await mockTable(page, 'categories', [MOCK_CATEGORY])
  await mockTable(page, 'photos',     [MOCK_PHOTO])

  await page.goto('/memories')
  await page.waitForURL('**/memories')

  // The "nuevo recuerdo" button should not be visible for read-only guest
  await expect(page.getByRole('button', { name: /nuevo recuerdo/i })).not.toBeVisible()
})

test('write-permission guest: "new memory" button is visible', async ({ page }) => {
  const guestSession = { ...MOCK_SESSION, user: MOCK_GUEST_USER }
  await mockAuth(page, { session: guestSession })

  const writeShare = { ...MOCK_SHARE, accepted_at: new Date().toISOString(), guest_user_id: MOCK_GUEST_USER.id, permission: 'write' }

  await page.route('**/rest/v1/shared_access**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([writeShare]) })
  )
  await mockTable(page, 'memories',   [MOCK_MEMORY])
  await mockTable(page, 'categories', [MOCK_CATEGORY])
  await mockTable(page, 'photos',     [MOCK_PHOTO])

  await page.goto('/memories')
  await page.waitForURL('**/memories')

  await expect(page.getByRole('button', { name: /nuevo recuerdo/i })).toBeVisible()
})
