/**
 * Supabase API Route Interceptors for Playwright
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides helper functions that intercept Supabase REST / Auth / Storage
 * requests via page.route() so tests never hit a real backend.
 *
 * Usage:
 *   import { mockAuth, mockTable } from './helpers/supabase-mock'
 *
 *   test('example', async ({ page }) => {
 *     await mockAuth(page, { session: MOCK_SESSION })
 *     await mockTable(page, 'memories', [MOCK_MEMORY])
 *     await page.goto('/')
 *   })
 *
 * ── How Supabase session detection works ──────────────────────────────────────
 * The Supabase JS client stores the active session in localStorage under the
 * key `sb-{projectRef}-auth-token`.  On every page load it reads that key
 * directly — it does NOT hit any network endpoint.  Therefore, HTTP-level
 * interceptors alone are NOT enough to authenticate a test: we must also
 * inject the session into localStorage before the page initialises.
 *
 * mockAuth() handles this automatically via page.addInitScript().
 */

import type { Page, Route } from '@playwright/test'

// ─── Supabase project config ──────────────────────────────────────────────────

// Keep in sync with VITE_SUPABASE_URL in .env.local
const SUPABASE_PROJECT_REF = 'zoxcehikgvkmvcifsmcu'
// The storage key used by @supabase/auth-js v2
const SUPABASE_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`

// ─── Generic helpers ─────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

// ─── Auth mocks ───────────────────────────────────────────────────────────────

interface MockAuthOpts {
  session?: object | null
  /** If set, the signIn call will return this error message */
  signInError?: string
  signUpError?: string
  /**
   * Whether to pre-populate localStorage with the session so the Supabase
   * client considers itself authenticated on the very first page load.
   * Default: true (when session is non-null).
   * Set to false for tests that start on /login and submit credentials
   * themselves — otherwise PublicOnlyRoute would redirect before the form
   * is ever shown.
   */
  injectStorage?: boolean
}

export async function mockAuth(page: Page, opts: MockAuthOpts = {}) {
  const { session = null, signInError, signUpError, injectStorage } = opts

  // ── Step 1: inject session into localStorage BEFORE the app boots ──────────
  // The Supabase JS client reads its session from localStorage on init — it
  // never hits the network just to discover the initial session.  Without this
  // injection every test that navigates to a protected route gets redirected to
  // /login because getSession() finds nothing in storage and returns null.
  // Skip injection (injectStorage: false) for tests that start on /login.
  if (session && injectStorage !== false) {
    const storedSession = {
      ...(session as Record<string, unknown>),
      // Make sure the token appears valid for the lifetime of the test suite
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // +24 h
    }
    await page.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value)
      },
      { key: SUPABASE_STORAGE_KEY, value: JSON.stringify(storedSession) },
    )
  }

  // ── Step 2: network-level interceptors (token refresh, signIn, signOut …) ──

  // GET /auth/v1/session  — token-refresh probe; return the session directly
  await page.route('**/auth/v1/session', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill(json(session ?? {}))
    } else {
      await route.continue()
    }
  })

  // POST /auth/v1/token?grant_type=password — signInWithPassword
  await page.route('**/auth/v1/token?grant_type=password', async (route: Route) => {
    if (signInError) {
      await route.fulfill(json({ error: signInError, error_description: signInError }, 400))
    } else {
      await route.fulfill(json({ ...session, error: null }))
    }
  })

  // POST /auth/v1/token?grant_type=refresh_token — refreshSession / notifyOwner
  // Return a clean session object. Including 'error: null' at the top level can
  // confuse the Supabase SDK's session parsing — only include actual session fields.
  await page.route('**/auth/v1/token?grant_type=refresh_token', async (route: Route) => {
    if (session) {
      const s = session as Record<string, unknown>
      await route.fulfill(json({
        access_token:  s.access_token,
        refresh_token: s.refresh_token,
        expires_in:    s.expires_in ?? 3600,
        token_type:    s.token_type ?? 'bearer',
        user:          s.user,
      }))
    } else {
      await route.fulfill(json({ error: 'invalid_grant', error_description: 'No session' }, 400))
    }
  })

  // POST /auth/v1/signup — signUp
  await page.route('**/auth/v1/signup', async (route: Route) => {
    if (signUpError) {
      await route.fulfill(json({ error: signUpError }, 400))
    } else {
      await route.fulfill(json({ data: { user: session ? (session as Record<string, unknown>).user : null }, error: null }))
    }
  })

  // POST /auth/v1/logout — signOut
  await page.route('**/auth/v1/logout', async (route: Route) => {
    await route.fulfill(json({}))
  })

  // Edge Functions — silently succeed so fire-and-forget callers don't error
  await page.route('**/functions/v1/**', async (route: Route) => {
    await route.fulfill(json({ ok: true }))
  })

  // GET /auth/v1/user — getUser
  // Supabase auth-js calls /auth/v1/user and expects the raw User object back.
  // The SDK then wraps it as { data: { user }, error: null } for callers.
  // So we return the user object (or empty object for anonymous).
  await page.route('**/auth/v1/user', async (route: Route) => {
    const s = session as Record<string, unknown> | null
    const user = s?.user ?? null
    if (user) {
      await route.fulfill(json(user))
    } else {
      await route.fulfill(json({}, 401))
    }
  })
}

// ─── REST table mocks ─────────────────────────────────────────────────────────

/**
 * Mock all requests to a Supabase REST table.
 * Supports GET (SELECT), POST (INSERT), PATCH (UPDATE), DELETE.
 */
export async function mockTable(
  page: Page,
  table: string,
  rows: object[],
  opts: {
    /** Override for POST/INSERT responses */
    insertResult?: object
    /** Override for PATCH/UPDATE responses */
    updateResult?: object
    /** Simulate error on all mutating operations */
    mutateError?: string
  } = {},
) {
  await page.route(`**/rest/v1/${table}**`, async (route: Route) => {
    const method = route.request().method()
    // When PostgREST `.single()` is used, the client sends
    // Accept: application/vnd.pgrst.object+json — we must return a plain
    // object, not an array, otherwise the JS client gets confused.
    const acceptSingle = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')

    if (method === 'GET') {
      if (acceptSingle) {
        // Return the first row as a plain object (or 404 if empty)
        const row = rows[0]
        if (row) {
          await route.fulfill({
            status: 200,
            contentType: 'application/vnd.pgrst.object+json',
            body: JSON.stringify(row),
          })
        } else {
          await route.fulfill({
            status: 406,
            contentType: 'application/json',
            body: JSON.stringify({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }),
          })
        }
      } else {
        // PostgREST responds with array for multiple rows
        await route.fulfill(json(rows))
      }
      return
    }

    if (opts.mutateError) {
      await route.fulfill(json({ message: opts.mutateError, code: 'E001', details: '', hint: '' }, 400))
      return
    }

    if (method === 'POST') {
      const row = opts.insertResult ?? (rows[0] ?? {})
      if (acceptSingle) {
        await route.fulfill({ status: 201, contentType: 'application/vnd.pgrst.object+json', body: JSON.stringify(row) })
      } else {
        // PostgREST with Prefer: return=representation returns array
        await route.fulfill({ ...json([row], 201), headers: { 'Content-Range': '0-0/*' } })
      }
      return
    }
    if (method === 'PATCH') {
      const row = opts.updateResult ?? (rows[0] ?? {})
      if (acceptSingle) {
        await route.fulfill({ status: 200, contentType: 'application/vnd.pgrst.object+json', body: JSON.stringify(row) })
      } else {
        await route.fulfill(json([row]))
      }
      return
    }
    if (method === 'DELETE') {
      await route.fulfill(json([]))
      return
    }

    await route.continue()
  })
}

// ─── RPC mocks ──────────────────────────────────────────────────────────────

/**
 * Mock a Supabase RPC function call.
 * The RPC endpoint is POST /rest/v1/rpc/{fnName}.
 * @param result  - The data to return on success (null to skip).
 * @param opts.error - If set, return a 400 PostgREST error with this as the message.
 */
export async function mockRpc(
  page: Page,
  fnName: string,
  result: object | null,
  opts: { error?: string } = {},
) {
  await page.route(`**/rest/v1/rpc/${fnName}**`, async (route: Route) => {
    if (opts.error) {
      await route.fulfill(
        json({ message: opts.error, code: 'P0001', details: null, hint: null }, 400),
      )
    } else {
      await route.fulfill(json(result ?? {}))
    }
  })
}

// ─── Storage mocks ────────────────────────────────────────────────────────────

export async function mockStorage(
  page: Page,
  opts: { uploadError?: string } = {},
) {
  // XHR POST upload
  await page.route('**/storage/v1/object/**', async (route: Route) => {
    if (opts.uploadError) {
      await route.fulfill(json({ error: opts.uploadError }, 400))
    } else {
      await route.fulfill(json({ Key: 'mock/path.jpg' }))
    }
  })
  // Public URL template
  await page.route('**/storage/v1/object/public/**', (route) => route.continue())
}

// ─── Convenience: authenticated page setup ────────────────────────────────────

/**
 * Shorthand: mock auth with an active session + return the page after goto.
 * Call this at the start of any test that requires a logged-in state.
 * Also mocks shared_access (needed by useGuestMode on every authenticated page).
 */
export async function setupAuthenticatedPage(
  page: Page,
  session: object,
  extraMocks?: (page: Page) => Promise<void>,
) {
  await mockAuth(page, { session })
  // useGuestMode queries shared_access on every page; return empty = not a guest
  await mockTable(page, 'shared_access', [])
  if (extraMocks) await extraMocks(page)
  await page.goto('/')
  // App redirects '/' → '/dashboard' for authenticated users
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}
