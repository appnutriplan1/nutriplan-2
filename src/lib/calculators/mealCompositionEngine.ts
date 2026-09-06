import type { Alimento } from '../../services/alimentosService'
import type { Receta } from '../../services/supabaseRecetas'
import type { DistribucionComida } from './mealPlanDistribution'
import { obtenerPorciones, type PorcionAlimento, type RolAlimento } from './foodPortionLibrary'
import { clasificarRolReceta, type RolReceta } from './recipeRoleClassifier'

export type ComponenteComida =
  | { id: string; tipo: 'receta'; rol: string; etiqueta: string; kcal: number; proteina: number; carbs: number; grasas: number; receta: Receta }
  | { id: string; tipo: 'alimento'; rol: string; etiqueta: string; kcal: number; proteina: number; carbs: number; grasas: number; porcion: PorcionAlimento }

export type ComidaConstruida = {
  tipo: DistribucionComida['tipo']
  nombre: string
  objetivoKcal: number
  componentes: ComponenteComida[]
  kcal: number
  proteina: number
  carbs: number
  grasas: number
  diferenciaKcal: number
}

const etiquetaRolReceta: Record<RolReceta, string> = {
  principal: 'Principal', desayuno: 'Preparación principal', snack: 'Snack', postre_fit: 'Postre fit', ensalada: 'Verduras', sopa: 'Sopa o entrada', acompanamiento: 'Acompañamiento',
}
const etiquetaRolAlimento: Record<RolAlimento, string> = {
  proteina: 'Proteína', carbohidrato: 'Fuente de energía', verdura: 'Verduras', fruta: 'Algo fresco', lacteo: 'Lácteo proteico', grasa: 'Grasa saludable',
}

function componenteReceta(receta: Receta): ComponenteComida {
  const rol = clasificarRolReceta(receta)
  return { id: `receta-${receta.id}`, tipo: 'receta', rol, etiqueta: etiquetaRolReceta[rol], kcal: receta.nutricion.kcal, proteina: receta.nutricion.proteina, carbs: receta.nutricion.carbs, grasas: receta.nutricion.grasas, receta }
}

function componenteAlimento(porcion: PorcionAlimento): ComponenteComida {
  return { id: `alimento-${porcion.alimento.id}`, tipo: 'alimento', rol: porcion.rol, etiqueta: etiquetaRolAlimento[porcion.rol], kcal: porcion.kcal, proteina: porcion.proteina, carbs: porcion.carbs, grasas: porcion.grasas, porcion }
}

function elegir<T>(items: T[], rotacion: number, usados: Set<string>, id: (item: T) => string): T | undefined {
  const disponibles = items.filter((item) => !usados.has(id(item)))
  const fuente = disponibles.length ? disponibles : items
  return fuente.length ? fuente[Math.abs(rotacion) % fuente.length] : undefined
}

function rolesRecetaPara(tipo: DistribucionComida['tipo']): RolReceta[] {
  if (tipo === 'desayuno') return ['desayuno', 'principal']
  if (tipo === 'media_mañana' || tipo === 'media_tarde') return ['snack', 'postre_fit']
  return ['principal']
}

function rolesAlimentoPara(tipo: DistribucionComida['tipo']): RolAlimento[] {
  if (tipo === 'desayuno') return ['proteina', 'carbohidrato', 'fruta', 'lacteo', 'grasa']
  if (tipo === 'media_mañana' || tipo === 'media_tarde') return ['proteina', 'lacteo', 'carbohidrato', 'fruta', 'grasa']
  if (tipo === 'almuerzo') return ['proteina', 'carbohidrato', 'verdura', 'grasa', 'fruta']
  return ['proteina', 'verdura', 'carbohidrato', 'grasa']
}

function porcionCompatibleConMomento(porcion: PorcionAlimento, tipo: DistribucionComida['tipo']) {
  const nombre = porcion.alimento.nombre.toLowerCase()
  if (tipo === 'desayuno' && porcion.rol === 'proteina') return nombre.includes('huevo')
  if (tipo === 'media_mañana' || tipo === 'media_tarde') {
    if (porcion.rol === 'proteina') return nombre.includes('huevo') || nombre.includes('atún') || nombre.includes('atun')
    if (porcion.rol === 'carbohidrato') return ['pan', 'galleta', 'camote', 'choclo', 'avena'].some((item) => nombre.includes(item))
  }
  return true
}

export function construirComida(args: {
  comida: DistribucionComida
  recetas: Receta[]
  alimentos: Alimento[]
  rotacion?: number
  idsUsados?: Set<string>
}): ComidaConstruida {
  const { comida, recetas, alimentos, rotacion = 0, idsUsados = new Set<string>() } = args
  const componentes: ComponenteComida[] = []
  const agregar = (componente?: ComponenteComida) => { if (componente && !componentes.some((actual) => actual.id === componente.id)) componentes.push(componente) }
  const rolesPrincipales = rolesRecetaPara(comida.tipo)
  const recetasValidas = recetas.filter((receta) => rolesPrincipales.includes(clasificarRolReceta(receta)) && receta.nutricion.kcal <= comida.kcalObjetivo * 1.1)
  const recetaPrincipal = elegir(recetasValidas, rotacion, idsUsados, (receta) => receta.id)
  if (recetaPrincipal) agregar(componenteReceta(recetaPrincipal))

  // Una ensalada o sopa pequeña puede participar, pero nunca ocupar el lugar principal.
  if (comida.tipo === 'almuerzo' || comida.tipo === 'cena') {
    const laterales = recetas.filter((receta) => ['ensalada', 'sopa', 'acompanamiento'].includes(clasificarRolReceta(receta)))
    const lateral = elegir(laterales, rotacion + 1, idsUsados, (receta) => receta.id)
    if (lateral && lateral.nutricion.kcal <= comida.kcalObjetivo * 0.35) agregar(componenteReceta(lateral))
  }

  const roles = rolesAlimentoPara(comida.tipo)
  const tienePrincipal = componentes.some((componente) => componente.rol === 'principal' || componente.rol === 'desayuno' || componente.rol === 'snack' || componente.rol === 'postre_fit')
  for (const rol of roles) {
    const total = componentes.reduce((suma, componente) => suma + componente.kcal, 0)
    if (total >= comida.kcalObjetivo * 0.92) break
    if (rol === 'proteina' && tienePrincipal && componentes.reduce((suma, componente) => suma + componente.proteina, 0) >= comida.proteinaObjetivo * 0.75) continue
    const porciones = obtenerPorciones(alimentos, rol).filter((porcion) => porcionCompatibleConMomento(porcion, comida.tipo) && porcion.kcal <= Math.max(comida.kcalObjetivo - total + 80, 120))
    const porcion = elegir(porciones, rotacion + componentes.length, idsUsados, (item) => item.alimento.id)
    if (porcion) agregar(componenteAlimento(porcion))
  }

  const kcal = componentes.reduce((suma, componente) => suma + componente.kcal, 0)
  const proteina = componentes.reduce((suma, componente) => suma + componente.proteina, 0)
  const carbs = componentes.reduce((suma, componente) => suma + componente.carbs, 0)
  const grasas = componentes.reduce((suma, componente) => suma + componente.grasas, 0)
  return { tipo: comida.tipo, nombre: comida.nombre, objetivoKcal: comida.kcalObjetivo, componentes, kcal: Math.round(kcal), proteina: Math.round(proteina), carbs: Math.round(carbs), grasas: Math.round(grasas), diferenciaKcal: Math.round(comida.kcalObjetivo - kcal) }
}
