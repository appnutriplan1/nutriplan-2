import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(await fs.readFile(path.join(root, 'datos/biblioteca-editorial/biblioteca_aprobada.json'), 'utf8'))
const libraries = await Promise.all(manifest.lotes.map(async (entry) => JSON.parse(await fs.readFile(path.join(root, 'datos/biblioteca-editorial', entry.archivo), 'utf8'))))
const csv = await fs.readFile(path.join(root, libraries[0].archivoFuenteCenan), 'utf8')
const cenanIds = new Set(csv.split(/\r?\n/).slice(1).map((line) => line.split(',')[0].replace(/^"|"$/g, '')).filter(Boolean))

const errors = []
const ids = new Set()
const cenanIdsUsados = new Set()
for (const [libraryIndex, library] of libraries.entries()) {
  const manifestEntry = manifest.lotes[libraryIndex]
  if (library.lote !== manifestEntry.lote) errors.push(`El archivo ${manifestEntry.archivo} no corresponde al lote declarado.`)
  if (library.totalComponentes !== manifestEntry.componentes || library.componentes.length !== manifestEntry.componentes) errors.push(`El lote ${library.lote} debe contener exactamente ${manifestEntry.componentes} componentes.`)
  if (library.decisionesPendientes.length !== 3 || library.decisionesPendientes.some((decision) => decision.estado !== 'PENDIENTE')) errors.push(`El lote ${library.lote} debe conservar las tres decisiones pendientes.`)
  for (const [index, item] of library.componentes.entries()) {
    const label = `lote${library.lote}.componentes.${index}`
    if (ids.has(item.id)) errors.push(`${label}.id está duplicado: ${item.id}`)
    ids.add(item.id)
    if (cenanIdsUsados.has(item.cenanId)) errors.push(`${label}.cenanId se repite entre lotes: ${item.cenanId}`)
    cenanIdsUsados.add(item.cenanId)
    if (!cenanIds.has(item.cenanId)) errors.push(`${label}.cenanId no existe en CENAN: ${item.cenanId}`)
    if (!['APROBADO', 'REVISAR', 'PENDIENTE_DECISION'].includes(item.estadoRevision)) errors.push(`${label} tiene un estado de revisión inválido.`)
    if (!Array.isArray(item.porciones) || item.porciones.length === 0) errors.push(`${label} no tiene porciones.`)
    if (item.porciones?.filter((portion) => portion.esPredeterminada).length !== 1) errors.push(`${label} debe tener una porción predeterminada.`)
    const forbidden = new Set(item.momentosProhibidos)
    if (item.momentosPermitidos.some((moment) => forbidden.has(moment))) errors.push(`${label} contiene momentos permitidos y prohibidos a la vez.`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Biblioteca editorial válida: ${ids.size} componentes en ${libraries.length} lotes aprobados; 3 decisiones pendientes; sugerencias aún bloqueadas.`)
