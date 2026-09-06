import { readFile, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('../supabase/seed-recipes.json', import.meta.url)
const source = JSON.parse(await readFile(sourceUrl, 'utf8'))

const recipes = source.map((recipe) => ({
  id: recipe.id,
  numero: recipe.numero,
  titulo: recipe.titulo,
  categoria_id: recipe.categoria_id,
  categoria_nombre: recipe.categoria_nombre,
  descripcion: recipe.descripcion || '',
  imagen_principal: recipe.imagen_principal,
  tiempo_minutos: recipe.tiempo_minutos || 30,
  dificultad: recipe.dificultad || 'Fácil',
  porciones: recipe.porciones || 1,
  nutricion: recipe.nutricion || {},
  ingredientes: recipe.ingredientes || [],
  pasos: recipe.pasos || [],
  tags: (recipe.tags || []).filter((tag) => String(tag).trim().toLowerCase() !== 'premium'),
  tips_del_chef: recipe.tips_del_chef || [],
  proteina_principal: recipe.proteina_principal || null,
  estado: 'GRATUITO',
  mostrar_a_pacientes: true,
  visible: true,
  orden: recipe.orden ?? recipe.numero,
  created_at: recipe.created_at || new Date().toISOString(),
}))

if (recipes.length !== 100 || new Set(recipes.map((recipe) => recipe.id)).size !== 100) {
  throw new Error('La semilla debe contener 100 identificadores únicos.')
}

await writeFile(sourceUrl, `${JSON.stringify(recipes, null, 2)}\n`)
console.log('Semilla normalizada: 100 recetas gratuitas y únicas.')
