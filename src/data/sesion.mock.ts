import type { PacienteRaw, PlanRaw, RecursoRaw, SeguimientoRaw } from '../services/dataService'

interface SesionMock {
  paciente: PacienteRaw
  planes: PlanRaw[]
  seguimiento: SeguimientoRaw[]
  recursos?: RecursoRaw[]
}

/**
 * Fixtures de desarrollo (VITE_DATA_MODE=mock). Mismas claves snake_case que
 * devolvería Apps Script, para reusar los mismos mappers en ambos modos.
 *
 * Códigos de prueba:
 *   nc_DEMO-0001      → paciente ACTIVO (login exitoso)
 *   nc_DEMO-SUSPEND   → paciente SUSPENDIDO (login rechazado, como pide el modelo)
 */
export const SESIONES_MOCK: Record<string, SesionMock> = {
  'nc_DEMO-0001': {
    paciente: {
      id: 'P001',
      codigo_acceso: 'nc_DEMO-0001',
      estado: 'ACTIVO',
      nombre: 'María Fernández',
      correo: 'maria@email.com',
      sexo: 'F',
      fecha_nacimiento: '1994-03-12',
      talla_cm: 165,
      objetivo: 'Bajar grasa',
      fecha_actualizacion: '2026-07-01',
      notas: '',
      // Línea base: con lo que entró al plan. La evolución va en `seguimiento`.
      inicio_plan: '2026-06-02',
      peso_kg: 70.0,
      cintura_cm: 81,
      grasa_pct: 34.2,
      glucosa: 96,
      trigliceridos: 155,
      colesterol: 205,
      hemoglobina: 12.4,
    },
    planes: [
      {
        id: 'PL002',
        paciente_id: 'P001',
        titulo: 'Plan de reducción de grasa · Julio',
        url_pdf: '/sample-plans/plan-demo.pdf',
        estado: 'VIGENTE',
        fecha_inicio: '2026-07-01',
        fecha_fin: '2026-07-31',
        kcal_objetivo: 1700,
        proteinas_g: 140,
        carbohidratos_g: 175,
        grasas_g: 47,
      },
      {
        id: 'PL001',
        paciente_id: 'P001',
        titulo: 'Plan de mantenimiento · Junio',
        url_pdf: '/sample-plans/plan-demo.pdf',
        estado: 'ARCHIVADO',
        fecha_inicio: '2026-06-01',
        fecha_fin: '2026-06-30',
        kcal_objetivo: 1900,
        proteinas_g: 130,
        carbohidratos_g: 210,
        grasas_g: 55,
      },
    ],
    // Controles posteriores al inicio del plan. No todos traen análisis:
    // los de laboratorio se piden cada cierto tiempo, no en cada control.
    seguimiento: [
      { id: 'S001', paciente_id: 'P001', fecha: '2026-06-16', peso_kg: 69.1, cintura_cm: 80, talla_cm: 165, notas: '' },
      { id: 'S002', paciente_id: 'P001', fecha: '2026-06-30', peso_kg: 68.3, cintura_cm: 79, talla_cm: 165, notas: '' },
      {
        id: 'S003',
        paciente_id: 'P001',
        fecha: '2026-07-07',
        peso_kg: 67.8,
        cintura_cm: 78,
        talla_cm: 165,
        grasa_pct: 32.1,
        glucosa: 91,
        trigliceridos: 132,
        colesterol: 188,
        hemoglobina: 12.9,
        notas: 'Control con análisis',
      },
      { id: 'S004', paciente_id: 'P001', fecha: '2026-07-15', peso_kg: 67.2, cintura_cm: 77, talla_cm: 165, notas: '' },
      {
        id: 'S005',
        paciente_id: 'P001',
        fecha: '2026-07-21',
        peso_kg: 66.5,
        cintura_cm: 76,
        talla_cm: 165,
        grasa_pct: 31.4,
        notas: 'Buena adherencia',
      },
    ],
    recursos: [
      { id: 'R001', plan_id: 'PL002', tipo: 'PLAN', titulo: 'Plan completo (kcal y menús)', url_pdf: '/sample-plans/plan-demo.pdf', orden: 1 },
      { id: 'R002', plan_id: 'PL002', tipo: 'COMPRAS', titulo: 'Lista de compras de la semana', url_pdf: '/sample-plans/plan-demo.pdf', orden: 2 },
      { id: 'R003', plan_id: 'PL002', tipo: 'INTERCAMBIOS', titulo: 'Lista de intercambios', url_pdf: '/sample-plans/plan-demo.pdf', orden: 3 },
    ],
  },
  'nc_DEMO-SUSPEND': {
    paciente: {
      id: 'P002',
      codigo_acceso: 'nc_DEMO-SUSPEND',
      estado: 'SUSPENDIDO',
      nombre: 'Paciente Suspendida',
      correo: 'suspendida@email.com',
      sexo: 'F',
      fecha_nacimiento: '1990-01-01',
      talla_cm: 160,
      objetivo: 'Mantener',
      fecha_actualizacion: '2026-06-01',
      notas: '',
    },
    planes: [],
    seguimiento: [],
  },
}
