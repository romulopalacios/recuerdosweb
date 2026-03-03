/**
 * E2E — Memory CRUD
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers:
 *  ✅  List renders memories from API
 *  ✅  Create memory: form validates & submits
 *  ✅  Edit memory: pre-fills form fields (via three-dot menu)
 *  ✅  Delete memory: confirm dialog (via three-dot menu)
 *  ✅  Cancel delete: memory stays visible
 *  ✅  Search: client-side filtering shows/hides cards
 *  🔁  Regression BUG-06: "%" is treated as literal char — does NOT act as wildcard
 *  🔁  Regression BUG-12: future (2150) and very old (1800) dates rejected by form
 *  ✅  Unsaved-changes guard when closing dirty form
 *  ✅  Memory detail page renders title and location
 *
 * IMPORTANT: search is 100% client-side (useMemo in Memories.tsx).
 * The server-side `search` option in memoriesService is NOT used by the UI —
 * filtering happens after `allMemories` is loaded. Tests reflect this reality.
 */

import { test, expect, type Page } from '@playwright/test'
import { mockAuth, mockTable } from './helpers/supabase-mock'
import {
  MOCK_SESSION,
  MOCK_MEMORY,
  MOCK_CATEGORY,
  MOCK_PHOTO,
} from './helpers/fixtures'

// ─── Shared page setup ────────────────────────────────────────────────────────

/**
 * Sets up authentication + all API mocks needed to render /memories cleanly.
 * Uses a single, conflict-free route per table to avoid override issues.
 */
async function setupMemoriesPage(page: Page) {
  await mockAuth(page, { session: MOCK_SESSION })

  // Not a guest — return empty shared_access row
  await mockTable(page, 'shared_access', [])
  await mockTable(page, 'categories', [MOCK_CATEGORY])

  // Photos used by CardCarousel — return empty per-memory
  await page.route('**/rest/v1/photos**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  // Memories: single handler covering SELECT, count (head=true), INSERT, UPDATE, DELETE
  await page.route('**/rest/v1/memories**', async (route) => {
    const method = route.request().method()
    const url    = route.request().url()

    if (method === 'GET' && url.includes('head=true')) {
      return route.fulfill({
        status: 200, contentType: 'application/json', body: 'null',
        headers: { 'Content-Range': '*/12' },
      })
    }
    if (method === 'GET') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([MOCK_MEMORY]),
      })
    }
    if (method === 'POST') {
      return route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify([MOCK_MEMORY]),
        headers: { 'Content-Range': '0-0/*' },
      })
    }
    if (method === 'PATCH') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ ...MOCK_MEMORY, updated_at: new Date().toISOString() }]),
      })
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.continue()
  })

  await page.goto('/memories')
  await page.waitForURL('**/memories')
}

// ─── List ─────────────────────────────────────────────────────────────────────

test('memories list: renders memory card with title', async ({ page }) => {
  await setupMemoriesPage(page)
  await expect(page.getByText(MOCK_MEMORY.title)).toBeVisible()
})

test('memories list: renders category badge', async ({ page }) => {
  await setupMemoriesPage(page)
  await expect(page.getByText(MOCK_CATEGORY.name)).toBeVisible()
})

// ─── Create ───────────────────────────────────────────────────────────────────

test('create memory: opens form on "Nuevo recuerdo" click', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('create memory: empty title shows validation error', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByRole('button', { name: 'Guardar recuerdo' }).click()
  await expect(page.getByText(/título es obligatorio/i)).toBeVisible()
})

test('create memory: valid form closes modal on submit', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Nuestra boda')
  await page.getByLabel('Fecha del recuerdo *').fill('2025-09-15')
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click()

  await expect(
    page.getByText(/recuerdo guardado|¡recuerdo guardado/i),
  ).toBeVisible({ timeout: 7_000 })
})

// ─── BUG-12 regressions: date validation ─────────────────────────────────────

test('BUG-12 regression: year 2150 is rejected with a date-range error', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Recuerdo del futuro')
  await page.getByLabel('Fecha del recuerdo *').fill('2150-01-01')
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click()

  await expect(page.getByText(/fecha debe estar entre/i)).toBeVisible()
})

test('BUG-12 regression: year 1800 is rejected with a date-range error', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Recuerdo histórico')
  await page.getByLabel('Fecha del recuerdo *').fill('1800-06-14')
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click()

  await expect(page.getByText(/fecha debe estar entre/i)).toBeVisible()
})

test('BUG-12 regression: a valid 2025 date passes without a date error', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Recuerdo válido')
  await page.getByLabel('Fecha del recuerdo *').fill('2025-06-14')
  await page.getByRole('button', { name: 'Guardar recuerdo' }).click()

  await expect(page.getByText(/fecha debe estar entre/i)).not.toBeVisible()
})

// ─── Edit (via three-dot menu) ────────────────────────────────────────────────

test('edit memory: three-dot menu opens and Editar is clickable', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.locator('[data-testid="memory-menu-trigger"]').first().click()
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
})

test('edit memory: clicking Editar pre-fills the form with existing data', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.locator('[data-testid="memory-menu-trigger"]').first().click()
  await page.getByRole('button', { name: 'Editar' }).click()

  await page.getByRole('dialog').waitFor()
  await expect(page.getByLabel('Título *')).toHaveValue(MOCK_MEMORY.title)
  await expect(page.getByLabel('Fecha del recuerdo *')).toHaveValue('2025-06-14')
})

// ─── Delete (via three-dot menu) ─────────────────────────────────────────────

test('delete memory: clicking Eliminar shows confirmation dialog', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.locator('[data-testid="memory-menu-trigger"]').first().click()
  await page.getByRole('button', { name: 'Eliminar' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/¿Eliminar/i)).toBeVisible()
})

test('delete memory: cancelling keeps the memory visible', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.locator('[data-testid="memory-menu-trigger"]').first().click()
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByRole('button', { name: 'Cancelar' }).click()
  // After cancelling, the dialog closes and the memory card is still present
  await expect(page.locator('[data-testid="memory-card"]').first()).toBeVisible()
})

// ─── Client-side search ───────────────────────────────────────────────────────
// NOTE: Memories.tsx does NOT pass `search` to the API — it uses useMemo to
// filter the already-loaded allMemories array.

test('search: typing a matching term keeps the card visible', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByPlaceholder(/buscar por título/i).fill('París')
  await expect(page.getByText(MOCK_MEMORY.title)).toBeVisible()
})

test('search: typing a non-matching term hides the card', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByPlaceholder(/buscar por título/i).fill('XXXXXXNONEXISTENT')
  await expect(page.getByText(MOCK_MEMORY.title)).not.toBeVisible()
})

// ─── BUG-06 regression ────────────────────────────────────────────────────────

test('BUG-06 regression: "%" hides memories that contain no literal "%"', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByPlaceholder(/buscar por título/i).fill('%')
  await expect(page.getByText(MOCK_MEMORY.title)).not.toBeVisible()
})

test('BUG-06 regression: clearing "%" restores the memory card', async ({ page }) => {
  await setupMemoriesPage(page)
  const searchBox = page.getByPlaceholder(/buscar por título/i)
  await searchBox.fill('%')
  await expect(page.getByText(MOCK_MEMORY.title)).not.toBeVisible()
  await searchBox.clear()
  await expect(page.getByText(MOCK_MEMORY.title)).toBeVisible()
})

// ─── Unsaved-changes guard ─────────────────────────────────────────────────────

test('dirty form shows discard confirmation when closed via Cancelar', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Algo sin guardar')
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await expect(page.getByText(/descartar cambios/i)).toBeVisible()
})

test('discard dialog: "Seguir editando" keeps the form open with the value', async ({ page }) => {
  await setupMemoriesPage(page)
  await page.getByRole('button', { name: 'Nuevo recuerdo' }).click()
  await page.getByRole('dialog').waitFor()

  await page.getByLabel('Título *').fill('Algo sin guardar')
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByText(/descartar cambios/i).waitFor()

  await page.getByRole('button', { name: /seguir editando/i }).click()
  await expect(page.getByLabel('Título *')).toHaveValue('Algo sin guardar')
})

// ─── Memory detail page ───────────────────────────────────────────────────────

test('memory detail: renders title and location', async ({ page }) => {
  await mockAuth(page, { session: MOCK_SESSION })
  await mockTable(page, 'shared_access', [])
  await mockTable(page, 'categories', [MOCK_CATEGORY])

  // getMemoryById uses .single() → PostgREST sends Accept: vnd.pgrst.object+json
  // Our mockTable now detects that header and returns a single object.
  // But to be safe (and test both list + single endpoints), override manually.
  await page.route('**/rest/v1/memories**', (route) => {
    const accept = route.request().headers()['accept'] ?? ''
    if (accept.includes('vnd.pgrst.object')) {
      // .single() call → return single object
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify({ ...MOCK_MEMORY, photos: [MOCK_PHOTO] }),
      })
    }
    // Normal list call → return array
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ ...MOCK_MEMORY, photos: [MOCK_PHOTO] }]),
    })
  })
  await page.route('**/rest/v1/photos**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PHOTO]) }),
  )

  await page.goto(`/memories/${MOCK_MEMORY.id}`)
  await expect(page.getByText(MOCK_MEMORY.title)).toBeVisible({ timeout: 8_000 })
  await expect(page.getByText(MOCK_MEMORY.location!)).toBeVisible()
})
