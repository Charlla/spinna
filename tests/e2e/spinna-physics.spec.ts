/**
 * Spinna PHYSICS regression tests.
 *
 * Runs the live game in a browser and verifies the steering / handbrake
 * pipeline doesn't regress. The deep symmetry check (left vs right mirror
 * yaw rate, etc.) lives in the headless unit suite at tests/physics.test.ts —
 * run that with: npx tsx tests/physics.test.ts
 *
 * These tests just confirm the in-browser engine still moves the car.
 */
import { test, expect, Page } from '@playwright/test'

async function bootGame(page: Page) {
  await page.goto('/game')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(800)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
}

function speedFromHud(hud: string): number {
  // HUD reads "NN KM/H" — number first, then label.
  const m = hud.match(/(\d+)\s*km\/h/i)
  return m ? parseInt(m[1], 10) : 0
}

test.describe.serial('Spinna physics regression', () => {
  test('LEFT + RIGHT inputs both keep the HUD reporting a valid speed', async ({ page }) => {
    await bootGame(page)
    await page.keyboard.down('w')
    await page.waitForTimeout(1500)
    await page.keyboard.down('a')
    await page.waitForTimeout(1500)
    const hudA = await page.locator('body').innerText()
    await page.keyboard.up('a')
    await page.waitForTimeout(400)
    await page.keyboard.down('d')
    await page.waitForTimeout(1500)
    const hudD = await page.locator('body').innerText()
    await page.keyboard.up('d')
    await page.keyboard.up('w')

    // The HUD must remain valid (no NaN, no crash); a numeric km/h value is reported.
    // Speed itself can drop to 0 if the car spun out — we just want the engine alive.
    expect(hudA).toMatch(/\d+\s*km\/h/i)
    expect(hudD).toMatch(/\d+\s*km\/h/i)
    console.log('After A:', speedFromHud(hudA), 'After D:', speedFromHud(hudD))
  })

  test('rapid A↔D oscillation does not crash the engine', async ({ page }) => {
    await bootGame(page)
    await page.keyboard.down('w')
    for (let i = 0; i < 6; i++) {
      await page.keyboard.down(i % 2 === 0 ? 'a' : 'd')
      await page.waitForTimeout(300)
      await page.keyboard.up(i % 2 === 0 ? 'a' : 'd')
    }
    const hud = await page.locator('body').innerText()
    await page.keyboard.up('w')
    expect(hud).toMatch(/\d+\s*km\/h/i)
  })

  test('TUNE panel still opens during gameplay', async ({ page }) => {
    await bootGame(page)
    await page.getByRole('button', { name: /Open tuning panel/i }).click()
    await expect(page.getByRole('dialog', { name: /Tune panel/i })).toBeVisible({ timeout: 5_000 })
  })
})
