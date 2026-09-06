import fs from 'node:fs'

const path = 'datos/biblioteca-editorial/recetas_100_plantillas_local.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))
const expected = ['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena']
const errors = []
if (data.templates?.length !== 100) errors.push(`Se esperaban 100 recetas y hay ${data.templates?.length ?? 0}.`)
if (new Set(data.templates?.map((item) => item.id)).size !== 100) errors.push('Los IDs no son 100 valores únicos.')
for (const moment of expected) {
  const rows = data.templates.filter((item) => item.momento === moment)
  if (rows.length !== 20) errors.push(`${moment}: se esperaban 20 y hay ${rows.length}.`)
}
for (const item of data.templates) {
  if (!item.nombre || item.ingredientes.length < 2 || item.pasos.length < 1) errors.push(`${item.id}: contenido incompleto.`)
  if (!(item.gramosPorcionBase > 0) || !(item.nutricionBase.kcal > 0) || !(item.nutricionBase.proteina > 0)) errors.push(`${item.id}: nutrición o porción inválida.`)
  if ((item.momento === 'media_manana' || item.momento === 'media_tarde') && item.nutricionBase.proteina < 8) errors.push(`${item.id}: colación con menos de 8 g de proteína.`)
  if ((item.momento === 'almuerzo' || item.momento === 'cena') && item.nutricionBase.proteina < 20) errors.push(`${item.id}: comida principal con menos de 20 g de proteína.`)
  const text = `${item.nombre} ${item.ingredientes.map((ingredient) => ingredient.texto).join(' ')}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (item.momento === 'desayuno' && /arroz|lentej|garban|frijol|frejol|pallar/.test(text)) errors.push(`${item.id}: desayuno con arroz o menestra.`)
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('OK: 100 recetas únicas, 20 por momento, completas y dentro de las reglas estructurales.')
