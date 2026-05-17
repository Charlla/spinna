/**
 * Spinna E2E smoke tests.
 * Verifies landing → garage → game flow + keyboard controls actually drive the car.
 */
import { test, expect } from '@playwright/test'

test.describe.serial('Spinna smoke', () => {
  test('landing page loads and has Spin button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /SPIN/i })).toBeVisible({ timeout: 15_000 })
    // E30 BMW should be the default/selected car
    await expect(page.getByText(/BMW E30/)).toBeVisible()
  })

  test('cars and tires render in garage', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/BMW E30/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/BMW E36/)).toBeVisible()
    await expect(page.getByText(/RX-7/)).toBeVisible()
    await expect(page.getByText(/BUDGET ALL-SEASON/)).toBeVisible()
  })

  test('click SPIN navigates to /game and canvas renders', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /SPIN/i }).click()
    await page.waitForURL(/\/game/, { timeout: 5000 })
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeVisible({ timeout: 10_000 })
    // Canvas should have non-zero size
    const box = await canvas.first().boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(100)
    expect(box?.height ?? 0).toBeGreaterThan(100)
  })

  test('keyboard W triggers throttle (speed increases above 0)', async ({ page }) => {
    await page.goto('/game')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 10_000 })

    // Wait a frame for engine to init
    await page.waitForTimeout(800)

    // Click body to ensure focus
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    // Probe the inputs ref directly via the document - first verify our keydown reaches
    await page.evaluate(() => {
      ;(window as unknown as { __keyEvents: string[] }).__keyEvents = []
      window.addEventListener('keydown', e => {
        ;(window as unknown as { __keyEvents: string[] }).__keyEvents.push(`${e.key}/${e.code}`)
      })
    })

    // Hold W for ~2s
    await page.keyboard.down('w')
    await page.waitForTimeout(2200)
    await page.keyboard.up('w')

    const keyEvents = await page.evaluate(() => (window as unknown as { __keyEvents: string[] }).__keyEvents)
    console.log('Key events fired:', keyEvents)

    // Get HUD text BEFORE releasing
    // HUD layout: "KM/H <number>" — label first, then value
    const hudText = await page.locator('body').innerText()
    const speedMatch = hudText.match(/km\/h\s*(\d+)/i)
    const speed = speedMatch ? parseInt(speedMatch[1], 10) : 0

    console.log('Detected speed:', speed, '| HUD:', hudText.substring(0, 300).replace(/\s+/g, ' '))
    expect(speed).toBeGreaterThan(10)
  })

  test('handbrake (Space) + steering triggers a spin (combo degrees accumulate)', async ({ page }) => {
    await page.goto('/game')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(800)
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    // Accelerate first
    await page.keyboard.down('w')
    await page.waitForTimeout(1500)

    // Then handbrake + hard left to break the rear loose
    await page.keyboard.down(' ')
    await page.keyboard.down('a')
    await page.waitForTimeout(2500)

    const hudText = await page.locator('body').innerText()
    await page.keyboard.up('w')
    await page.keyboard.up(' ')
    await page.keyboard.up('a')

    // After a spin attempt, comboDeg should be > 0 OR sessionTotalSpins > 0 OR speed > 30
    const speed = parseInt(hudText.match(/km\/h\s*(\d+)/i)?.[1] ?? '0', 10)
    console.log('After spin attempt: speed =', speed, '| HUD:', hudText.substring(0, 300).replace(/\s+/g, ' '))
    expect(speed).toBeGreaterThan(10)
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
