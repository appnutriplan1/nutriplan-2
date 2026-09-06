import fs from 'node:fs'

const library = JSON.parse(fs.readFileSync('datos/biblioteca-editorial/preparaciones_lote1_local.json', 'utf8'))
const lot1 = JSON.parse(fs.readFileSync('datos/biblioteca-editorial/lote1_componentes.json', 'utf8'))
const lot2 = JSON.parse(fs.readFileSync('datos/biblioteca-editorial/lote2_componentes_corregido.json', 'utf8'))
const components = new Map([...lot1.componentes, ...lot2.componentes].map((item) => [item.id, item]))
const errors = []
const ids = new Set()

if (library.preparaciones.length !== 50) errors.push(`Se esperaban 50 preparaciones; llegaron ${library.preparaciones.length}.`)
for (const preparation of library.preparaciones) {
  if (ids.has(preparation.id)) errors.push(`Preparación duplicada: ${preparation.id}`)
  ids.add(preparation.id)
  for (const ingredient of preparation.ingredientes) {
    const component = components.get(ingredient.componentId)
    if (!component) { errors.push(`${preparation.id}: componente inexistente ${ingredient.componentId}`); continue }
    if (component.estadoRevision === 'PENDIENTE_DECISION') errors.push(`${preparation.id}: usa componente bloqueado ${ingredient.componentId}`)
    if (!component.porciones.some((portion) => portion.gramos === ingredient.gramosBase)) errors.push(`${preparation.id}: ${ingredient.gramosBase} g no es una porción aprobada de ${ingredient.componentId}`)
  }
  const usesDecision3Egg = preparation.ingredientes.some((ingredient) => ingredient.componentId === 'PRO-02')
  if (usesDecision3Egg !== (preparation.estadoOperativo === 'BLOQUEADA_DECISION_3')) errors.push(`${preparation.id}: bloqueo de Decisión 3 incoherente`)
}

const counts = Object.fromEntries(['Desayuno', 'Colacion dulce', 'Colacion salada', 'Almuerzo', 'Cena'].map((type) => [type, library.preparaciones.filter((item) => item.tipo === type).length]))
const expected = { Desayuno: 12, 'Colacion dulce': 8, 'Colacion salada': 8, Almuerzo: 11, Cena: 11 }
for (const [type, count] of Object.entries(expected)) if (counts[type] !== count) errors.push(`${type}: ${counts[type]} en lugar de ${count}`)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`Biblioteca válida: 50 plantillas, ${library.preparaciones.filter((item) => item.estadoOperativo === 'ACTIVA_LOCAL').length} activas, ${library.preparaciones.filter((item) => item.estadoOperativo !== 'ACTIVA_LOCAL').length} bloqueadas por Decisión 3.`)
console.log(JSON.stringify(counts))
