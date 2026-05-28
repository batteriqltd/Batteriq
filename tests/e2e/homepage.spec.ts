import { test, expect } from '@playwright/test'

test('homepage loads and shows EcoFlow heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('EcoFlow')
  await expect(page.locator('h1')).toContainText('Kenya')
})

test('navigation links are present', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /EcoFlow Kenya/i }).first()).toBeVisible()
})

test('cart badge is visible in header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /shopping cart/i })).toBeVisible()
})
