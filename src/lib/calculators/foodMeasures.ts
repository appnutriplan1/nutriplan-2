import type { Alimento } from '../../services/alimentosService'

// Solo huevos enteros de gallina. Usar códigos exactos evita confundirlos con
// clara, yema, codorniz o alimentos cuyo nombre también contiene «huevo».
const HUEVOS_GALLINA_ENTEROS = new Set(['J3', 'J4', 'J16'])

export function medidaCaseraBasica(alimento: Alimento) {
  if (HUEVOS_GALLINA_ENTEROS.has(alimento.id)) {
    return { gramos: 50, texto: 'Referencia: 1 huevo = 50 g' }
  }
  return null
}
