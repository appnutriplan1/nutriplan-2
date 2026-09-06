import { readFile, writeFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/lib/publicRecipes.ts', import.meta.url), 'utf8')
const arrayBody = source.match(/PUBLIC_RECIPE_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1]
if (!arrayBody) throw new Error('No se encontró PUBLIC_RECIPE_IDS')
const ids = [...arrayBody.matchAll(/'([^']+)'/g)].map((match) => match[1])
if (ids.length !== 100) throw new Error(`Se esperaban 100 recetas y se encontraron ${ids.length}`)

const recipes = []
for (let index = 0; index < ids.length; index += 8) {
  const batch = ids.slice(index, index + 8)
  const rows = await Promise.all(batch.map(async (id) => {
    const response = await fetch('https://www.nutriplan.pe/api/receta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.ok || !payload.receta) {
      throw new Error(`No se pudo exportar ${id}: ${payload.error || response.status}`)
    }
    return { ...payload.receta, estado: 'GRATUITO', visible: true }
  }))
  recipes.push(...rows)
}

await writeFile(new URL('../supabase/seed-recipes.json', import.meta.url), `${JSON.stringify(recipes, null, 2)}\n`)
console.log(`Exportadas ${recipes.length} recetas públicas.`)
