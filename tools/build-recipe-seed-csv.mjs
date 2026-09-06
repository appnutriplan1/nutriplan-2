import { readFile, writeFile } from 'node:fs/promises'

const recipes = JSON.parse(await readFile(new URL('../supabase/seed-recipes.json', import.meta.url), 'utf8'))
const columns = [
  'id', 'numero', 'titulo', 'categoria_id', 'categoria_nombre', 'descripcion',
  'imagen_principal', 'tiempo_minutos', 'dificultad', 'porciones', 'nutricion',
  'ingredientes', 'pasos', 'tags', 'tips_del_chef', 'proteina_principal', 'estado',
  'mostrar_a_pacientes', 'visible', 'orden', 'created_at',
]

function cell(value) {
  const normalized = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
  return `"${normalized.replaceAll('"', '""')}"`
}

const csv = [columns.join(','), ...recipes.map((recipe) => columns.map((column) => cell(recipe[column])).join(','))].join('\n')
await writeFile(new URL('../supabase/seed-recipes.csv', import.meta.url), `${csv}\n`)
console.log(`CSV generado: ${recipes.length} recetas.`)
