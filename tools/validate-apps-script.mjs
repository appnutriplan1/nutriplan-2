import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const root = path.resolve('apps-script/production')
const files = fs.readdirSync(root).filter((name) => name.endsWith('.gs')).sort()
const sources = files.map((name) => ({ name, source: fs.readFileSync(path.join(root, name), 'utf8') }))
const functions = new Map()

for (const { name, source } of sources) {
  for (const match of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const locations = functions.get(match[1]) ?? []
    locations.push(name)
    functions.set(match[1], locations)
  }
}

const duplicates = [...functions].filter(([, locations]) => locations.length > 1)
if (duplicates.length) {
  throw new Error(`Funciones duplicadas:\n${duplicates.map(([name, locations]) => `- ${name}: ${locations.join(', ')}`).join('\n')}`)
}

const combined = sources.map(({ name, source }) => `// ${name}\n${source}`).join('\n\n')
new vm.Script(combined, { filename: 'NutriPlan-AppsScript-consolidado.js' })

const router = sources.find(({ name }) => name === 'Codigo.gs')?.source ?? ''
const actions = new Set([...router.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map((match) => match[1]))
const requiredActions = [
  'estado_servicio', 'login', 'planes', 'seguimiento', 'recursos',
  'pdf', 'recurso', 'alimentos', 'cookbooks', 'educacion', 'rutinas', 'receta_permisos',
  'admin_resumen', 'admin_guardar_paciente', 'admin_guardar_plan', 'admin_guardar_ciclo',
  'admin_generar_codigo', 'admin_guardar_recurso', 'admin_eliminar_recurso',
  'admin_guardar_permiso_receta', 'admin_guardar_permisos_recetas',
  'admin_inicializar_permisos_recetas',
  'push_suscribir', 'push_desuscribir', 'push_suscripciones_paciente',
  'push_eliminar_endpoints', 'push_planes_por_vencer', 'push_marcar_recordatorio',
]
const missingActions = requiredActions.filter((action) => !actions.has(action))
if (missingActions.length) throw new Error(`Acciones ausentes del router: ${missingActions.join(', ')}`)

for (const singleton of ['doGet', 'doPost', 'manejarSolicitud', 'leerParametros', 'responder']) {
  if (functions.get(singleton)?.length !== 1) throw new Error(`${singleton} debe existir exactamente una vez`)
}

const forbiddenNames = files.filter((name) => /parche|completo/i.test(name))
if (forbiddenNames.length) throw new Error(`Archivos no desplegables en production: ${forbiddenNames.join(', ')}`)

console.log(`Apps Script valido: ${files.length} archivos, ${functions.size} funciones, ${actions.size} acciones, sin duplicados.`)
