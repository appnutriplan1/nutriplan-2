import fs from 'node:fs'

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))
const library = read('datos/biblioteca-editorial/biblioteca_rutinas.json')
const model = read('datos/biblioteca-editorial/modelo_rutinas.json')
const exercises = library.ejercicios
const muscleIds = new Set(model.musculos.map((item) => item.id))
const ranks = { INICIAL: 1, INTERMEDIO: 2, AVANZADO: 3 }
const userRanks = { PRINCIPIANTE: 1, MEDIO: 2, AVANZADO: 3 }
const equipment = {
  gimnasio: ['gimnasio', 'mancuernas', 'peso_corporal'],
  mancuernas: ['mancuernas', 'peso_corporal'],
  bandas: ['bandas', 'peso_corporal'],
  peso_corporal: ['peso_corporal'],
}
const errors = []

if (exercises.length !== 117) errors.push(`Se esperaban 117 ejercicios en la biblioteca consolidada y hay ${exercises.length}.`)
if (new Set(exercises.map((item) => item.id)).size !== exercises.length) errors.push('Hay IDs duplicados.')
if (muscleIds.size !== 14) errors.push(`Se esperaban 14 músculos separados y hay ${muscleIds.size}.`)

for (const exercise of exercises) if (exercise.zona !== 'Cuerpo completo' && !muscleIds.has(exercise.zona)) errors.push(`${exercise.id}: zona desconocida ${exercise.zona}.`)
for (const [level, rank] of Object.entries(userRanks)) {
  for (const [context, allowed] of Object.entries(equipment)) {
    for (const muscle of muscleIds) {
      const available = exercises.some((item) => item.zona === muscle && allowed.includes(item.equipo) && (ranks[item.nivel_minimo] ?? 99) <= rank)
      if (!available) errors.push(`${level}/${context}/${muscle}: sin ejercicio compatible.`)
    }
  }
}
for (const [days, variants] of Object.entries(model.distribuciones)) {
  for (const [level, distribution] of Object.entries(variants)) {
    if (distribution.length !== Number(days)) errors.push(`${days}/${level}: número de días incorrecto.`)
    for (const day of distribution) for (const muscle of day.musculos) if (!muscleIds.has(muscle)) errors.push(`${days}/${level}: músculo desconocido ${muscle}.`)
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`OK: ${exercises.length} ejercicios, ${muscleIds.size} músculos separados y cobertura completa por nivel/equipo.`)
