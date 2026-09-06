import { readFile } from 'node:fs/promises'

const url = process.env.TASK_SUPABASE_URL
const secret = process.env.TASK_SUPABASE_SECRET_KEY
if (!url || !secret) throw new Error('Faltan credenciales de Supabase.')

const recipes = JSON.parse(await readFile(new URL('../supabase/seed-recipes.json', import.meta.url), 'utf8'))
for (let index = 0; index < recipes.length; index += 20) {
  const response = await fetch(`${url}/rest/v1/recipes`, {
    method: 'POST',
    headers: {
      apikey: secret,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(recipes.slice(index, index + 20)),
  })
  if (!response.ok) throw new Error(`Supabase rechazó la carga: ${response.status} ${await response.text()}`)
}

const verification = await fetch(`${url}/rest/v1/recipes?select=id,estado,visible`, {
  headers: { apikey: secret, Prefer: 'count=exact' },
})
if (!verification.ok) throw new Error(`No se pudo verificar: ${verification.status}`)
const rows = await verification.json()
const valid = rows.length === 100 && rows.every((row) => row.estado === 'GRATUITO' && row.visible === true)
if (!valid) throw new Error(`Verificación inválida: ${rows.length} filas.`)
console.log('Supabase verificado: 100 recetas gratuitas y visibles.')
