import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })

try {
  const { validateWeeklyCookbook } = await server.ssrLoadModule('/src/lib/weeklyCookbookSchema.ts')
  const fixture = JSON.parse(await readFile(new URL('../public/examples/weekly-cookbook.example.json', import.meta.url), 'utf8'))
  const clone = () => structuredClone(fixture)

  assert.equal(validateWeeklyCookbook(fixture).ok, true, 'acepta el ejemplo válido')

  const empty = clone(); empty.recipes = []
  assert.equal(validateWeeklyCookbook(empty).ok, false, 'rechaza una lista vacía')

  const version = clone(); version.schema_version = '2.0'
  assert.equal(validateWeeklyCookbook(version).ok, false, 'rechaza una versión incompatible')

  const title = clone(); title.recipes[0].title = ''
  assert.equal(validateWeeklyCookbook(title).ok, false, 'rechaza una receta sin título')

  const ingredients = clone(); ingredients.recipes[0].ingredients = []
  assert.equal(validateWeeklyCookbook(ingredients).ok, false, 'rechaza una receta sin ingredientes')

  const unit = clone(); unit.recipes[0].ingredients[0].unit = ''
  assert.equal(validateWeeklyCookbook(unit).ok, true, 'acepta una unidad vacía sin inventar información clínica')

  const negative = clone(); negative.recipes[0].ingredients[0].quantity = -1
  assert.equal(validateWeeklyCookbook(negative).ok, false, 'rechaza cantidades negativas')

  const steps = clone(); steps.recipes[0].steps = []
  assert.equal(validateWeeklyCookbook(steps).ok, false, 'rechaza una receta sin pasos')

  const disorder = clone(); disorder.recipes[0].steps[1].order = 4
  assert.equal(validateWeeklyCookbook(disorder).ok, false, 'rechaza pasos desordenados')

  const duplicate = clone(); duplicate.recipes.push(structuredClone(duplicate.recipes[0]))
  assert.equal(validateWeeklyCookbook(duplicate).ok, false, 'rechaza identificadores duplicados')

  const nutrition = clone(); nutrition.recipes[0].nutrition_per_serving.kcal = -10
  assert.equal(validateWeeklyCookbook(nutrition).ok, false, 'rechaza nutrición negativa')

  const dates = clone(); dates.cookbook.week_end = '2026-08-10'
  assert.equal(validateWeeklyCookbook(dates).ok, false, 'rechaza un rango de fechas invertido')

  const missingImage = clone(); missingImage.recipes[0].image_file = null
  const missingImageResult = validateWeeklyCookbook(missingImage)
  assert.equal(missingImageResult.ok, true, 'permite una receta sin fotografía')
  assert.equal(missingImageResult.warnings.length > 0, true, 'advierte sobre fotografía ausente')

  const unknown = clone(); unknown.recipes[0].future_field = 'compatible'
  assert.equal(validateWeeklyCookbook(unknown).ok, true, 'tolera campos futuros desconocidos')

  console.log('weekly-cookbook: 14 pruebas correctas')
} finally {
  await server.close()
}
