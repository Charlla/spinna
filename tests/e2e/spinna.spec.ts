/**
 * Spinna E2E smoke tests.
 * Verifies the restored original UI:
 *   - Garage → SPIN → game canvas
 *   - Keyboard + on-screen joystick / sticky throttle controls
 *   - TUNE side panel opens, edits persist
 *   - Guest play works (no login required)
 */
import { test, expect } from '@playwright/test'

// HUD shows "<speed> KM/H" — strip whitespace then look for digits followed by km/h.
function extractSpeed(hud: string): number {
  const m = hud.match(/(\d+)\s*km\/h/i)
  return m ? parseInt(m[1], 10) : 0
}

test.describe.serial('Spinna smoke', () => {
  test('garage opens on step 1 (Pick your ride)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Pick your ride/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Your stable/i)).toBeVisible()
    await expect(page.getByText(/BMW E30/)).toBeVisible()
  })

  test('sequential flow: pick car → pick tyres → SPIN button appears', async ({ page }) => {
    await page.goto('/')
    // Step 1
    await expect(page.getByText(/Pick your ride/i)).toBeVisible({ timeout: 15_000 })
    // Click the owned E30 row
    await page.getByText('BMW E30 325i').click()
    // Step 2 — tyres
    await expect(page.getByText(/Mount your tyres/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/BUDGET ALL-SEASON/)).toBeVisible()
    await page.getByText('BUDGET ALL-SEASON').click()
    // Step 3 — confirm
    await expect(page.getByText(/Ready to spin/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: /SPIN/i })).toBeVisible()
  })

  test('guest can run through the flow without signing in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Sign in to save scores/i)).toBeVisible({ timeout: 5_000 })
    await page.getByText('BMW E30 325i').click()
    await page.getByText('BUDGET ALL-SEASON').click()
    await page.getByRole('button', { name: /SPIN/i }).click()
    await page.waitForURL(/\/game/, { timeout: 5_000 })
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
  })

  test('SPIN navigates to /game and canvas renders', async ({ page }) => {
    await page.goto('/')
    await page.getByText('BMW E30 325i').click()
    await page.getByText('BUDGET ALL-SEASON').click()
    await page.getByRole('button', { name: /SPIN/i }).click()
    await page.waitForURL(/\/game/, { timeout: 5_000 })
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible({ timeout: 10_000 })
    const box = await canvas.first().boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(100)
    expect(box?.height ?? 0).toBeGreaterThan(100)
  })

  test('HUD shows score / bank / km-h chips and CASH+TUNE buttons', async ({ page }) => {
    await page.goto('/game')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('SCORE', { exact: true })).toBeVisible()
    await expect(page.getByText('BANK', { exact: true })).toBeVisible()
    await expect(page.getByText('KM/H', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cash out/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Open tuning panel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Exit to garage/i })).toBeVisible()
  })

  test('on-screen joystick and throttle controls render', async ({ page }) => {
    await page.goto('/game')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('slider', { name: 'Steering' })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Throttle' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Handbrake' })).toBeVisible()
  })

  test('TUNE panel opens, sliders work, and values persist to localStorage', async ({ page }) => {
    await page.goto('/game')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Open tuning panel/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Tune panel' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Engine Power')).toBeVisible()
    await expect(dialog.getByText('Spin Threshold')).toBeVisible()

    // Tweak one slider then confirm localStorage has it.
    const slider = dialog.getByRole('slider', { name: 'Engine Power' })
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '2.10'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const stored = await page.evaluate(() => localStorage.getItem('spinna_tune_v3'))
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { enginePower: number }
    expect(parsed.enginePower).toBeCloseTo(2.10, 1)

    // Reset button restores defaults (enginePower → 1.55)
    await dialog.getByRole('button', { name: /RESET TO DEFAULTS/i }).click()
    const stored2 = await page.evaluate(() => localStorage.getItem('spinna_tune_v3'))
    const parsed2 = JSON.parse(stored2!) as { enginePower: number }
    expect(parsed2.enginePower).toBeCloseTo(1.55, 2)
  })

  test('throttle slider sticks at tapped position', async ({ page }) => {
    await page.goto('/game')
    const throttle = page.getByRole('slider', { name: 'Throttle' })
    await expect(throttle).toBeVisible({ timeout: 10_000 })

    const box = await throttle.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    // Tap near the top (≈ full forward) then release. Slider must hold the value.
    const x = box.x + box.width / 2
    const y = box.y + 30
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(300)

    const valueNow = await throttle.getAttribute('aria-valuenow')
    expect(valueNow).not.toBeNull()
    const v = parseFloat(valueNow!)
    expect(v).toBeGreaterThan(0.4) // stuck near forward
  })

  test('keyboard W triggers throttle (speed increases above 0)', async ({ page }) => {
    await page.goto('/game')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(800)
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    await page.keyboard.down('w')
    await page.waitForTimeout(2200)
    const hudText = await page.locator('body').innerText()
    await page.keyboard.up('w')

    const speed = extractSpeed(hudText)
    console.log('Detected speed:', speed)
    expect(speed).toBeGreaterThan(10)
  })

  test('handbrake (Space) + steering keeps car moving', async ({ page }) => {
    await page.goto('/game')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(800)
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    await page.keyboard.down('w')
    await page.waitForTimeout(1500)
    await page.keyboard.down(' ')
    await page.keyboard.down('a')
    await page.waitForTimeout(2500)

    const hudText = await page.locator('body').innerText()
    await page.keyboard.up('w')
    await page.keyboard.up(' ')
    await page.keyboard.up('a')

    const speed = extractSpeed(hudText)
    expect(speed).toBeGreaterThan(10)
  })

  test('login page loads with guest fallback link', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /LOGIN/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Play as guest/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Register/i })).toBeVisible()
  })

  test('register page loads with guest fallback link', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByRole('button', { name: /JOIN/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Play as guest/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Login/i })).toBeVisible()
  })

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.locator('body')).toContainText(/leaderboard|top scores|no scores/i, { timeout: 10_000 })
  })

  test('auth/me returns 401 (not logged in) and /api/scores returns json', async ({ page }) => {
    const me = await page.request.get('/api/auth/me')
    expect(me.status()).toBe(401)
    const lb = await page.request.get('/api/scores')
    expect(lb.ok()).toBe(true)
    const body = await lb.json()
    expect(body).toHaveProperty('leaderboard')
  })
})
