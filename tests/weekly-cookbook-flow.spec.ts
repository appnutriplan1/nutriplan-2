import { expect, test } from '@playwright/test'

test.use({ launchOptions: { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' } })

test('paciente abre su recetario semanal y entra al modo cocina', async ({ page }) => {
  await page.goto('http://127.0.0.1:4191/')

  await page.getByLabel(/código/i).fill('nc_DEMO-0001')
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click()
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole('link', { name: /continuar leyendo/i }).click()
  await expect(page).toHaveURL(/\/plan\/PL002/)
  await expect(page.getByRole('heading', { name: 'Tus recetas de esta semana' })).toBeVisible()
  await expect(page.getByText('cantidad fija').first()).toBeVisible()

  await page.getByRole('button', { name: /ensalada tibia de pollo/i }).click()
  await expect(page.getByText('Porción fija')).toBeVisible()
  await expect(page.getByText(/no las modifiques/i)).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar modo cocina' }).click()
  await expect(page.getByText('Paso 1 de 3')).toBeVisible()
  await page.getByRole('button', { name: /siguiente/i }).click()
  await expect(page.getByText('Paso 2 de 3')).toBeVisible()
})

test('nutricionista importa, publica y entrega una semana al paciente', async ({ page }) => {
  await page.goto('http://127.0.0.1:4191/admin/recetarios')
  await page.locator('input[type="file"][accept*="json"]').setInputFiles('public/examples/weekly-cookbook.example.json')
  await expect(page.getByText('JSON válido')).toBeVisible()
  await expect(page.getByText('Panqueques de avena y arándanos')).toBeVisible()

  await page.getByRole('button', { name: 'Guardar borrador local' }).click()
  await expect(page.getByText(/borrador local guardado/i)).toBeVisible()
  await page.getByRole('button', { name: 'Publicar localmente' }).click()
  await expect(page.getByText(/publicada localmente/i)).toBeVisible()

  await page.goto('http://127.0.0.1:4191/')
  await page.getByLabel(/código/i).fill('nc_DEMO-0001')
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click()
  await page.getByRole('link', { name: /continuar leyendo/i }).click()
  await expect(page.getByRole('heading', { name: 'Recetario semanal' })).toBeVisible()
  await expect(page.getByRole('button', { name: /panqueques de avena/i })).toBeVisible()
})
