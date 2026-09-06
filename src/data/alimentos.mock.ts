export interface Alimento {
  id: string
  nombre: string
  grupo: string
  energiaKcal: number
  proteinasG: number
  grasaG: number
  carbohidratosG: number
}

// Forma cruda tal como la devuelve Apps Script (encabezados de la hoja
// ALIMENTOS, snake_case). El fixture mock usa la misma forma que el
// endpoint remoto para que dataService mapee ambos con el mismo código.
export interface AlimentoRaw {
  id: string
  nombre: string
  grupo: string
  energia_kcal: number
  proteinas_g: number
  grasa_g: number
  carbohidratos_g: number
}

/**
 * Datos de ejemplo (valores por 100 g). Placeholder mientras se importa
 * la Tabla Peruana de Composición de Alimentos (CENAN/INS) real.
 */
export const ALIMENTOS_MOCK: AlimentoRaw[] = [
  { id: 'A001', nombre: 'Pechuga de pollo', grupo: 'Carnes y aves', energia_kcal: 165, proteinas_g: 31, grasa_g: 3.6, carbohidratos_g: 0 },
  { id: 'A002', nombre: 'Arroz blanco cocido', grupo: 'Cereales', energia_kcal: 130, proteinas_g: 2.7, grasa_g: 0.3, carbohidratos_g: 28 },
  { id: 'A003', nombre: 'Quinua cocida', grupo: 'Cereales', energia_kcal: 120, proteinas_g: 4.4, grasa_g: 1.9, carbohidratos_g: 21 },
  { id: 'A004', nombre: 'Palta', grupo: 'Frutas', energia_kcal: 160, proteinas_g: 2, grasa_g: 15, carbohidratos_g: 9 },
  { id: 'A005', nombre: 'Huevo entero', grupo: 'Huevos y lácteos', energia_kcal: 155, proteinas_g: 13, grasa_g: 11, carbohidratos_g: 1.1 },
  { id: 'A006', nombre: 'Lentejas cocidas', grupo: 'Menestras', energia_kcal: 116, proteinas_g: 9, grasa_g: 0.4, carbohidratos_g: 20 },
  { id: 'A007', nombre: 'Camote amarillo', grupo: 'Tubérculos', energia_kcal: 86, proteinas_g: 1.6, grasa_g: 0.1, carbohidratos_g: 20 },
  { id: 'A008', nombre: 'Papa amarilla', grupo: 'Tubérculos', energia_kcal: 77, proteinas_g: 2, grasa_g: 0.1, carbohidratos_g: 17 },
  { id: 'A009', nombre: 'Filete de bonito', grupo: 'Pescados y mariscos', energia_kcal: 144, proteinas_g: 23, grasa_g: 5, carbohidratos_g: 0 },
  { id: 'A010', nombre: 'Queso fresco', grupo: 'Huevos y lácteos', energia_kcal: 264, proteinas_g: 18, grasa_g: 21, carbohidratos_g: 3.4 },
  { id: 'A011', nombre: 'Plátano de seda', grupo: 'Frutas', energia_kcal: 89, proteinas_g: 1.1, grasa_g: 0.3, carbohidratos_g: 23 },
  { id: 'A012', nombre: 'Espinaca cocida', grupo: 'Verduras', energia_kcal: 23, proteinas_g: 2.9, grasa_g: 0.4, carbohidratos_g: 3.6 },
  { id: 'A013', nombre: 'Avena en hojuelas', grupo: 'Cereales', energia_kcal: 389, proteinas_g: 17, grasa_g: 7, carbohidratos_g: 66 },
  { id: 'A014', nombre: 'Pan integral', grupo: 'Cereales', energia_kcal: 247, proteinas_g: 13, grasa_g: 3.4, carbohidratos_g: 41 },
  { id: 'A015', nombre: 'Almendras', grupo: 'Frutos secos', energia_kcal: 579, proteinas_g: 21, grasa_g: 50, carbohidratos_g: 22 },
]
