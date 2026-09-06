export interface EatingOutSuggestion {
  id: string
  day: string
  mealType: string
  venues: string[]
  options: { title: string; note: string }[]
  tip: string
  imageUrl: string
}

const make = (id: number, day: string, mealType: string, venues: string[], options: [string, string][], tip: string): EatingOutSuggestion => ({
  id: `comer-fuera-${id}`,
  day,
  mealType,
  venues,
  options: options.map(([title, note]) => ({ title, note })),
  tip,
  imageUrl: `/local-plans/liliana-comer-fuera/carta-${String(id).padStart(2, '0')}.png`,
})

export const EATING_OUT_BY_PLAN: Record<string, EatingOutSuggestion[]> = {
  'PL-LILIANA-04': [
    make(1, 'Martes', 'Desayuno', ['Hotel o buffet', 'Cafetería', 'Aeropuerto'], [['Huevos revueltos con tomate y pan integral tostado', 'Sin embutidos ni mantequilla.'], ['Yogur griego natural sin azúcar con papaya y pecanas', 'Fruta entera, no jugo.'], ['Pan integral con palta, huevo sancochado y tomate', 'Una sola porción de pan.']], 'Elige una sola fuente de pan o cereal. Pide los huevos sin embutidos y evita jugos, pastelería y mermeladas.'),
    make(2, 'Martes', 'Almuerzo', ['Menú ejecutivo', 'Restaurante criollo', 'Parrilla'], [['Pollo a la plancha con papa sancochada y ensalada cocida', 'Cambia las papas fritas por papa sancochada.'], ['Pescado a la plancha con camote y verduras al vapor', 'Sin salsa de mantequilla.'], ['Lomo de res magro salteado con poco arroz y verduras', 'Sillao aparte y media porción de arroz.']], 'Pide las salsas y el sillao aparte, poca sal, y cambia las papas fritas por papa sancochada, camote o choclo.'),
    make(3, 'Martes', 'Cena', ['Restaurante', 'Hotel', 'Servicio a la habitación'], [['Sopa de pollo con verduras y una papa pequeña', 'Sin crema ni caldo concentrado.'], ['Tortilla de claras con verduras y tostada integral', 'Poco aceite, sin queso cremoso.'], ['Pescado blanco a la plancha con camote y ensalada', 'Sin mantequilla ni salsa.']], 'Prioriza preparaciones simples, sin crema de leche, fritura ni aderezos abundantes.'),
    make(4, 'Miércoles', 'Desayuno', ['Buffet de hotel', 'Cafetería', 'Panadería'], [['Omelette de queso fresco y espinaca con tostada integral', 'Cocción sin mantequilla.'], ['Yogur griego con quinua pop y fruta fresca', 'Sin granola azucarada ni miel.'], ['Tostada integral con pavita y palta', 'Una sola porción de pan.']], 'En el buffet recorre primero huevos, yogur y fruta; sirve una sola vez y deja la estación de pastelería fuera.'),
    make(5, 'Miércoles', 'Almuerzo', ['Restaurante saludable', 'Menú ejecutivo', 'Parrilla'], [['Pavo a la plancha con quinua y verduras salteadas', 'Aderezo y sal aparte.'], ['Pescado al horno con choclo y ensalada', 'Sin ají y aliño aparte.'], ['Res magra a la parrilla con camote y ensalada', 'Sin cebolla cruda ni fritura.']], 'Que la proteína ocupe un cuarto del plato y la guarnición no sea frita; media porción de arroz si lo hubiera.'),
    make(6, 'Miércoles', 'Cena', ['Restaurante', 'Hotel', 'Cafetería'], [['Crema de zapallo sin crema de leche con pavo deshilachado', 'Sin mantequilla ni queso.'], ['Ensalada tibia de pollo con verduras cocidas y choclo', 'Aliño de limón aparte.'], ['Pescado a la plancha con papa pequeña y verduras', 'Sin salsa.']], 'Si la carta ofrece una crema, confirma que no lleve crema de leche, mantequilla ni caldo concentrado.'),
    make(7, 'Jueves', 'Desayuno', ['Hotel', 'Cafetería', 'Aeropuerto'], [['Huevos sancochados con pan integral y fruta entera', 'Elegir fruta entera.'], ['Avena cocida con yogur natural y papaya', 'Sin azúcar ni miel.'], ['Tostada integral con queso fresco, tomate y huevo', 'Sin mantequilla.']], 'Arma el desayuno con proteína, una sola fuente de carbohidrato y fruta entera; evita combinar pan, avena y jugo.'),
    make(8, 'Jueves', 'Almuerzo', ['Cevichería', 'Restaurante criollo', 'Menú ejecutivo'], [['Sudado de pescado sin ají con papa sancochada', 'Sin yuca frita y con poca sal.'], ['Estofado de pollo sin ají ni frejoles con poco arroz', 'Media porción de arroz.'], ['Res a la plancha con choclo y ensalada', 'Salsa del asado aparte.']], 'En cevichería elige pescado cocido; nada de leche de tigre, mariscos ni acompañamientos fritos.'),
    make(9, 'Jueves', 'Cena', ['Hotel', 'Cafetería', 'Preparación mínima'], [['Sopa de zapallito italiano con huevo sancochado', 'Sin crema ni cubitos de caldo.'], ['Sándwich integral de pavo con tomate y hojas verdes', 'Sin mayonesa ni queso cremoso.'], ['Pescado blanco con verduras al vapor y papa pequeña', 'Sin mantequilla.']], 'Busca una cena de bajo volumen graso y pide los aderezos aparte; evita quesos cremosos y sopas espesas.'),
    make(10, 'Viernes', 'Desayuno', ['Buffet de hotel', 'Cafetería', 'Sala de espera'], [['Yogur griego con fruta picada y semillas', 'Sin jarabes ni cereal azucarado.'], ['Pan integral con huevo, queso fresco y tomate', 'Una sola porción de pan.'], ['Huevo revuelto con espinaca y tostada integral', 'Poco aceite.']], 'Si el horario se retrasa, elige una opción completa en vez de picar varias piezas pequeñas de pastelería.'),
    make(11, 'Viernes', 'Almuerzo', ['Restaurante saludable', 'Restaurante criollo', 'Parrilla'], [['Pescado blanco a la plancha con quinua y verduras', 'Aliño aparte.'], ['Pollo a la brasa sin piel con camote y ensalada', 'Sin papas fritas; piel retirada en cocina.'], ['Lomo de res magro con poco arroz y verduras salteadas', 'Sin salsas oscuras.']], 'Evita platos con salsas oscuras o caldos comerciales; pide poca sal, guarnición sancochada y agua como bebida.'),
    make(12, 'Viernes', 'Cena', ['Hotel', 'Restaurante', 'Servicio a la habitación'], [['Sopa de verduras con pollo y una tostada integral', 'Sin fideos y con poca sal.'], ['Ensalada tibia de pavo con verduras cocidas y papa pequeña', 'Sin salsa ni fritura.'], ['Tortilla de champiñones y tomate con tostada integral', 'Sin queso cremoso.']], 'La última comida de la semana debe ser simple y reconocible; no compenses ni la saltes por haber comido fuera.'),
  ],
}
