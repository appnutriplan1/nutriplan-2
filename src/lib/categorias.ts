export type Categoria = {
  id: string
  nombre: string
  emoji: string
  descripcion: string
}

export const CATEGORIAS: Categoria[] = [
  {
    id: 'masa-muscular',
    nombre: 'MASA MUSCULAR',
    emoji: '💪',
    descripcion: 'Preparaciones con proteína y energía para acompañar objetivos de masa muscular.',
  },
  {
    id: 'control-de-peso',
    nombre: 'PÉRDIDA DE PESO',
    emoji: '⚖️',
    descripcion: 'Recetas auditadas, organizadas por momento de comida y con porciones definidas.',
  },
  {
    id: 'desayunos',
    nombre: 'Desayunos',
    emoji: '🍳',
    descripcion: 'Empieza el día con energía sin carbohidratos.',
  },
  {
    id: 'almuerzos',
    nombre: 'Almuerzos',
    emoji: '🍽️',
    descripcion: 'Platos principales contundentes para el mediodía.',
  },
  {
    id: 'meriendas',
    nombre: 'Meriendas',
    emoji: '☕',
    descripcion: 'Bocados salados para media tarde.',
  },
  {
    id: 'cenas',
    nombre: 'Cenas',
    emoji: '🌙',
    descripcion: 'Recetas reconfortantes para terminar el día.',
  },
  {
    id: 'ensaladas',
    nombre: 'Ensaladas',
    emoji: '🥗',
    descripcion: 'Frescas y completas para cualquier momento.',
  },
  {
    id: 'sopas-y-cremas',
    nombre: 'Sopas y cremas',
    emoji: '🍲',
    descripcion: 'Caldos y cremas que reconfortan.',
  },
  {
    id: 'snacks',
    nombre: 'Snacks',
    emoji: '🥨',
    descripcion: 'Bocados pequeños y aperitivos.',
  },
  {
    id: 'postres',
    nombre: 'Postres',
    emoji: '🍰',
    descripcion: 'Dulces sin azúcar sin culpa.',
  },
  {
    id: 'postres-fit',
    nombre: 'Postres Fit',
    emoji: '🧁',
    descripcion: 'Postres adaptados y auditados para disfrutar con porciones definidas.',
  },
  {
    id: 'toppins',
    nombre: 'Toppins',
    emoji: '🍓',
    descripcion: 'Salsas, cremas, compotas y coberturas para completar tus preparaciones.',
  },
  {
    id: 'bebidas',
    nombre: 'Bebidas',
    emoji: '🥤',
    descripcion: 'Bebidas bajas en carbohidratos.',
  },
]
