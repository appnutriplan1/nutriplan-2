import { expect, test } from '@playwright/test'

test.use({ launchOptions: { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' } })
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4192'

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE_URL}/calculadora-alimentos`)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
})

test('permite ingresar objetivo manual y muestra una distribución para el cálculo manual', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Calcula tu objetivo' })).toBeVisible()
  await page.getByRole('button', { name: 'Ingresar manualmente' }).click()
  await page.getByLabel('Objetivo diario').fill('1800')
  await page.getByRole('button', { name: 'Usar este objetivo' }).click()

  await expect(page.getByText(/1800\s*kcal/).first()).toBeVisible()
  await page.getByRole('button', { name: '4 comidas' }).click()
  await expect(page.getByRole('heading', { name: 'Tu día en 4 comidas' })).toBeVisible()
  await expect(page.getByText('Desayuno', { exact: true })).toBeVisible()
  await expect(page.getByText('Media mañana', { exact: true })).toBeVisible()
  await expect(page.getByText('Almuerzo', { exact: true })).toBeVisible()
  await expect(page.getByText('Cena', { exact: true })).toBeVisible()
  await expect(page.getByTestId('meal-desayuno')).toContainText('450 kcal')
  await expect(page.getByTestId('meal-media_mañana')).toContainText('216 kcal')
  await expect(page.getByTestId('meal-almuerzo')).toContainText('684 kcal')
  await expect(page.getByTestId('meal-cena')).toContainText('450 kcal')
  await expect(page.getByText('Úsalo como guía y calcula cada plato manualmente con los alimentos que elijas.')).toBeVisible()
  await expect(page.getByText(/Comida propuesta:|Regenerar comida/)).toHaveCount(0)
})

test('envía a metabolismo, guarda silenciosamente y permite volver con el objetivo', async ({ page }) => {
  await page.getByRole('link', { name: 'Calcula tu objetivo' }).click()
  await expect(page).toHaveURL(/calculadora-clinica\?returnTo=alimentos/)
  await expect(page.getByRole('link', { name: 'Usar este objetivo en mis comidas' })).toBeVisible()
  await expect(page.getByText(/Tu gasto calórico:/)).toHaveCount(0)

  await page.getByRole('link', { name: 'Usar este objetivo en mis comidas' }).click()
  await expect(page).toHaveURL(/calculadora-alimentos$/)
  await expect(page.getByText('Tu objetivo diario')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calcula tu objetivo' })).toHaveCount(0)
})
