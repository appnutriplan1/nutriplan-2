import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "outputs/plantilla_recetas_supabase";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const guide = wb.worksheets.add("Instrucciones");
const recipes = wb.worksheets.add("Recetas");
const catalogs = wb.worksheets.add("Catalogos");
const json = wb.worksheets.add("Ejemplo JSON");
const photos = wb.worksheets.add("Fotos branding");
const icons = wb.worksheets.add("Iconos proteína");

const colors = {
  cream: "#FAF7F2",
  paper: "#F1EBE1",
  ink: "#1A1A17",
  green: "#1F4A3F",
  sage: "#6B8F7D",
  coral: "#FF6B4A",
  mandarin: "#F2A65A",
  line: "#E4DCCF",
  muted: "#7A7468",
  white: "#FFFFFF",
};

for (const sheet of [guide, recipes, catalogs, json, photos, icons]) {
  sheet.showGridLines = false;
}

guide.getRange("A1:C1").merge();
guide.getRange("A1").values = [["Plantilla para adaptar recetas · NutriPlan"]];
guide.getRange("A1:C1").format = {
  fill: colors.green,
  font: { name: "Fraunces", size: 20, bold: true, color: colors.white },
  verticalAlignment: "center",
};
guide.getRange("A1:C1").format.rowHeight = 42;

guide.getRange("A3:C3").merge();
guide.getRange("A3").values = [[
  "Completa una fila por receta en la hoja “Recetas”. Esta plantilla conserva la estructura que actualmente consume Supabase."
]];
guide.getRange("A3:C3").format = {
  fill: colors.paper,
  font: { name: "Inter", size: 11, color: colors.ink },
  wrapText: true,
  verticalAlignment: "center",
};
guide.getRange("A3:C3").format.rowHeight = 42;

guide.getRange("A5:C5").values = [["Paso", "Qué hacer", "Regla importante"]];
guide.getRange("A6:C10").values = [
  [1, "Duplica una fila vacía o empieza en la fila 3 de “Recetas”.", "No cambies los nombres de las columnas."],
  [2, "Crea un ID único a partir de categoría y título.", "Minúsculas, sin tildes ni espacios; usa guiones."],
  [3, "Escribe ingredientes, pasos, tags y tips.", "Un elemento por línea dentro de la misma celda (Alt+Enter)."],
  [4, "Completa nutrición por porción.", "Usa números, sin escribir “g” ni “kcal” en las celdas."],
  [5, "Revisa la columna VALIDACIÓN.", "Debe mostrar “LISTA” antes de preparar la importación."],
];
guide.getRange("A5:C5").format = {
  fill: colors.mandarin,
  font: { name: "Inter", bold: true, color: colors.ink },
};
guide.getRange("A6:C10").format = {
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "inside", style: "thin", color: colors.line },
};
guide.getRange("A5:C10").format.borders = { preset: "outside", style: "thin", color: colors.line };
guide.getRange("A6:A10").format.horizontalAlignment = "center";
guide.getRange("A6:C10").format.rowHeight = 44;
guide.getRange("A:A").format.columnWidth = 20;
guide.getRange("B:B").format.columnWidth = 48;
guide.getRange("C:C").format.columnWidth = 48;

guide.getRange("A12:C12").values = [["Campo compuesto", "Cómo escribirlo", "Cómo llegará a Supabase"]];
guide.getRange("A13:C16").values = [
  ["ingredientes", "1 huevo↵100 g de pollo↵Sal al gusto", "Arreglo JSON de textos"],
  ["pasos", "Batir el huevo↵Cocinar el pollo↵Servir", "Arreglo JSON ordenado"],
  ["tags / tips_del_chef", "proteína alta↵rápido", "Arreglo JSON de textos"],
  ["nutricion / proteina_principal", "Completa sus columnas individuales", "Objeto JSON"],
];
guide.getRange("A12:C12").format = {
  fill: colors.sage,
  font: { name: "Inter", bold: true, color: colors.white },
};
guide.getRange("A13:C16").format = {
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  borders: { preset: "inside", style: "thin", color: colors.line },
};
guide.getRange("A12:C16").format.borders = { preset: "outside", style: "thin", color: colors.line };
guide.getRange("A13:C16").format.rowHeight = 38;

const headers = [
  "id*", "numero*", "titulo*", "categoria_id*", "categoria_nombre*", "descripcion*",
  "imagen_principal", "tiempo_minutos*", "dificultad*", "porciones*",
  "kcal*", "proteina_g*", "carbs_g*", "grasas_g*",
  "ingredientes*", "pasos*", "tags", "tips_del_chef",
  "proteina_id", "proteina_nombre", "proteina_emoji", "estado*", "VALIDACIÓN",
];
recipes.getRange("A1:W1").values = [headers];
recipes.getRange("A1:W1").format = {
  fill: colors.green,
  font: { name: "Inter", size: 10, bold: true, color: colors.white },
  wrapText: true,
  verticalAlignment: "center",
};
recipes.getRange("A1:W1").format.rowHeight = 38;
recipes.freezePanes.freezeRows(1);
recipes.freezePanes.freezeColumns(3);

const example = [
  "desayunos-7-panjarrepa-de-pollo", 7, "Panjarrepa de pollo", "desayunos", "Desayunos",
  "Preparación práctica, alta en proteína y fácil de preparar.",
  "/platos/desayunos-7-panjarrepa-de-pollo.webp", 25, "Fácil", 2,
  385, 32, 28, 15,
  "1 huevo\n2 cucharadas de harina de avena\n100 g de pechuga de pollo\n30 g de queso mozzarella\nSal y pimienta al gusto",
  "Batir el huevo con la harina de avena.\nCocinar la mezcla en una sartén antiadherente.\nAgregar el pollo y el queso.\nDoblar la preparación y servir caliente.",
  "proteína alta\n desayuno\nrápido",
  "Cocinar a fuego medio-bajo para evitar que la base se queme.",
  "pollo", "Pollo", "🍗", "PREMIUM", null,
];
recipes.getRange("A2:W2").values = [example];
recipes.getRange("A2:W2").format = {
  fill: "#FFF4E8",
  font: { name: "Inter", size: 9, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
};
recipes.getRange("A2:W2").format.rowHeight = 104;

const blankRows = Array.from({ length: 28 }, () => Array(23).fill(null));
recipes.getRange("A3:W30").values = blankRows;
recipes.getRange("A3:W30").format = {
  font: { name: "Inter", size: 9, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { insideHorizontal: { style: "thin", color: colors.line } },
};
recipes.getRange("A2:W30").format.borders = {
  bottom: { style: "thin", color: colors.line },
};

recipes.getRange("W2").formulas = [[
  '=IF(COUNTA(A2:V2)=0,"",IF(AND(A2<>"",B2>0,C2<>"",D2<>"",E2<>"",F2<>"",H2>0,I2<>"",J2>0,K2>=0,L2>=0,M2>=0,N2>=0,O2<>"",P2<>"",V2<>""),"LISTA","FALTAN DATOS"))'
]];
recipes.getRange("W2:W30").fillDown();
recipes.getRange("W2:W30").format = {
  font: { name: "Inter", size: 9, bold: true, color: colors.green },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
recipes.getRange("W2:W30").conditionalFormats.add("containsText", {
  text: "FALTAN DATOS",
  format: { fill: "#FFE6DF", font: { color: "#A13C24", bold: true } },
});
recipes.getRange("W2:W30").conditionalFormats.add("containsText", {
  text: "LISTA",
  format: { fill: "#E4F0E9", font: { color: colors.green, bold: true } },
});

recipes.getRange("I2:I30").dataValidation = {
  rule: { type: "list", formula1: "'Catalogos'!$A$2:$A$5" },
};
recipes.getRange("V2:V30").dataValidation = {
  rule: { type: "list", formula1: "'Catalogos'!$B$2:$B$4" },
};
for (const col of ["B", "H", "J", "K", "L", "M", "N"]) {
  recipes.getRange(`${col}2:${col}30`).format.numberFormat = "0";
}
recipes.getRange("B2:B30").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 9999 } };
recipes.getRange("H2:H30").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 1440 } };
recipes.getRange("J2:J30").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 100 } };

const widths = {
  A: 34, B: 10, C: 30, D: 20, E: 22, F: 46, G: 42, H: 14, I: 13, J: 11,
  K: 10, L: 13, M: 11, N: 11, O: 52, P: 58, Q: 28, R: 44, S: 16, T: 20,
  U: 14, V: 13, W: 18,
};
for (const [col, width] of Object.entries(widths)) recipes.getRange(`${col}:${col}`).format.columnWidth = width;

const table = recipes.tables.add("A1:W30", true, "PlantillaRecetas");
table.style = "TableStyleMedium4";
table.showFilterButton = true;

catalogs.getRange("A1:B1").values = [["Dificultad", "Estado"]];
catalogs.getRange("A2:B5").values = [
  ["Muy fácil", "GRATUITO"],
  ["Fácil", "PREMIUM"],
  ["Medio", "OCULTO"],
  ["Difícil", null],
];
catalogs.getRange("A1:B1").format = {
  fill: colors.green,
  font: { name: "Inter", bold: true, color: colors.white },
};
catalogs.getRange("A2:B5").format = {
  font: { name: "Inter", color: colors.ink },
  borders: { preset: "inside", style: "thin", color: colors.line },
};
catalogs.getRange("A:B").format.columnWidth = 22;

const jsonText = `{
  "id": "desayunos-7-panjarrepa-de-pollo",
  "numero": 7,
  "titulo": "Panjarrepa de pollo",
  "categoria_id": "desayunos",
  "categoria_nombre": "Desayunos",
  "descripcion": "Preparación práctica, alta en proteína y fácil de preparar.",
  "imagen_principal": "/platos/desayunos-7-panjarrepa-de-pollo.webp",
  "tiempo_minutos": 25,
  "dificultad": "Fácil",
  "porciones": 2,
  "nutricion": {
    "kcal": 385,
    "proteina": 32,
    "carbs": 28,
    "grasas": 15
  },
  "ingredientes": ["1 huevo", "100 g de pollo", "Sal al gusto"],
  "pasos": ["Batir el huevo.", "Cocinar el pollo.", "Servir."],
  "tags": ["proteína alta", "rápido"],
  "tips_del_chef": ["Cocinar a fuego medio-bajo."],
  "proteina_principal": {"id": "pollo", "nombre": "Pollo", "emoji": "🍗"},
  "estado": "PREMIUM"
}`;
json.getRange("A1:H1").merge();
json.getRange("A1").values = [["Ejemplo del resultado esperado en Supabase"]];
json.getRange("A1:H1").format = {
  fill: colors.green,
  font: { name: "Fraunces", size: 18, bold: true, color: colors.white },
};
json.getRange("A3:H30").merge();
json.getRange("A3").values = [[jsonText]];
json.getRange("A3:H30").format = {
  fill: colors.ink,
  font: { name: "Consolas", size: 10, color: "#F6F0E7" },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: colors.sage },
};
json.getRange("A:H").format.columnWidth = 15;

photos.getRange("A1:F1").merge();
photos.getRange("A1").values = [["Guía visual para fotografías de recetas"]];
photos.getRange("A1:F1").format = {
  fill: colors.green,
  font: { name: "Fraunces", size: 19, bold: true, color: colors.white },
  verticalAlignment: "center",
};
photos.getRange("A1:F1").format.rowHeight = 42;
photos.getRange("A3:B3").values = [["Elemento", "Regla de branding"]];
photos.getRange("A4:B13").values = [
  ["Formato", "Vertical 3:4. Tamaño recomendado: 1000 × 1333 px."],
  ["Fondo", "Mesa de madera natural clara, tono miel suave."],
  ["Vajilla", "Plato redondo de cerámica blanca mate."],
  ["Ángulo", "Vista cenital o cenital con inclinación muy ligera."],
  ["Encuadre", "Plato centrado; debe ocupar aproximadamente 75–85 % de la imagen."],
  ["Iluminación", "Luz natural suave y difusa desde la parte superior izquierda."],
  ["Sombras", "Tenues, realistas y dirigidas hacia la parte inferior derecha."],
  ["Color", "Natural, cálido, luminoso y apetitoso; sin saturación artificial."],
  ["Estilo", "Editorial gastronómico premium, saludable, humano y accesible."],
  ["Evitar", "Texto, logos, manos, cubiertos, servilletas, mármol, fondo oscuro y decoración innecesaria."],
];
photos.getRange("A3:B3").format = {
  fill: colors.mandarin,
  font: { name: "Inter", bold: true, color: colors.ink },
};
photos.getRange("A4:B13").format = {
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { insideHorizontal: { style: "thin", color: colors.line } },
};
photos.getRange("A3:B13").format.borders = { preset: "outside", style: "thin", color: colors.line };
photos.getRange("A:A").format.columnWidth = 20;
photos.getRange("B:B").format.columnWidth = 82;
photos.getRange("A4:B13").format.rowHeight = 30;

const generationPrompt = `Fotografía gastronómica editorial premium de [NOMBRE DE LA RECETA].

El plato debe mostrar claramente [DESCRIPCIÓN VISUAL EXACTA DE LA PREPARACIÓN Y SUS INGREDIENTES VISIBLES].

Servir la preparación en un plato redondo de cerámica blanca mate, colocado sobre una mesa de madera natural clara color miel suave. Composición minimalista y limpia, sin objetos adicionales. Vista cenital con una inclinación muy ligera, encuadre vertical 3:4. El plato ocupa entre el 75 % y el 85 % de la imagen y está centrado, con pequeños márgenes de madera visibles.

Iluminación natural, luminosa y difusa desde la parte superior izquierda, sombras suaves y realistas hacia la parte inferior derecha. Balance de blancos cálido y neutro. Colores naturales, frescos y apetitosos. Texturas reales de los alimentos, detalles nítidos, cocción creíble, porción nutricional realista y presentación casera cuidada.

Estética coherente con un recetario nutricional editorial premium: cálida, saludable, sencilla, humana y accesible. Fotografía profesional de alimentos, alta resolución, profundidad de campo amplia, todo el plato enfocado.

Sin texto, sin logotipos, sin marcas de agua, sin manos, sin personas, sin cubiertos, sin servilletas, sin ingredientes dispersos, sin plantas decorativas, sin fondo oscuro, sin mármol y sin elementos fuera del plato.`;

const editPrompt = `Editar esta fotografía conservando fielmente la receta, sus ingredientes, cantidades, colores, textura y forma de presentación. No cambiar ni inventar alimentos.

Reemplazar únicamente el entorno visual por el branding fotográfico de NutriPlan: servir o presentar la preparación en un plato redondo de cerámica blanca mate sobre una mesa de madera natural clara color miel suave.

Usar una composición minimalista, limpia y editorial. Vista cenital con una inclinación muy ligera, formato vertical 3:4. Centrar el plato y hacer que ocupe aproximadamente el 80 % del encuadre.

Aplicar iluminación natural suave y difusa desde la parte superior izquierda, con sombras tenues y realistas hacia la parte inferior derecha. Mantener colores naturales, cálidos y luminosos, textura realista y enfoque nítido en toda la preparación.

Eliminar cualquier objeto del fondo: cubiertos, manos, servilletas, recipientes, textos, logotipos, marcas de agua, adornos y alimentos dispersos. El resultado debe parecer fotografiado en la misma sesión editorial que las demás recetas de NutriPlan.`;

photos.getRange("A15:F15").merge();
photos.getRange("A15").values = [["PROMPT PARA CREAR UNA FOTO NUEVA"]];
photos.getRange("A15:F15").format = {
  fill: colors.sage,
  font: { name: "Inter", bold: true, color: colors.white },
};
photos.getRange("A16:F29").merge();
photos.getRange("A16").values = [[generationPrompt]];
photos.getRange("A16:F29").format = {
  fill: colors.paper,
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: colors.line },
};
photos.getRange("A31:F31").merge();
photos.getRange("A31").values = [["PROMPT PARA ADAPTAR UNA FOTO EXISTENTE"]];
photos.getRange("A31:F31").format = {
  fill: colors.sage,
  font: { name: "Inter", bold: true, color: colors.white },
};
photos.getRange("A32:F43").merge();
photos.getRange("A32").values = [[editPrompt]];
photos.getRange("A32:F43").format = {
  fill: colors.paper,
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: colors.line },
};

icons.getRange("A1:D1").merge();
icons.getRange("A1").values = [["Catálogo de iconos para proteína principal"]];
icons.getRange("A1:D1").format = {
  fill: colors.green,
  font: { name: "Fraunces", size: 19, bold: true, color: colors.white },
};
icons.getRange("A3:D3").values = [["proteina_id", "proteina_nombre", "proteina_emoji", "Cuándo usarlo"]];
icons.getRange("A4:D15").values = [
  ["pollo", "Pollo", "🍗", "Pechuga, muslo o preparaciones con pollo."],
  ["res", "Res", "🥩", "Carne de res, lomo, bistec o carne molida."],
  ["pescado", "Pescado", "🐟", "Pescados blancos o recetas generales de pescado."],
  ["atun", "Atún", "🐟", "Recetas cuya proteína principal sea atún."],
  ["mariscos", "Mariscos", "🦐", "Camarones, langostinos y otros mariscos."],
  ["huevo", "Huevo", "🥚", "Tortillas, revueltos y preparaciones basadas en huevo."],
  ["cerdo", "Cerdo", "🐖", "Lomo, chuleta u otras preparaciones de cerdo."],
  ["pavo", "Pavo", "🦃", "Pavo, jamón de pavo o preparaciones similares."],
  ["legumbres", "Legumbres", "🫘", "Lentejas, frejoles, garbanzos y similares."],
  ["tofu", "Tofu / soya", "🌱", "Tofu, soya y proteínas vegetales."],
  ["lacteos", "Lácteos", "🧀", "Queso o lácteos como fuente principal de proteína."],
  ["vegetariana", "Vegetariana", "🥬", "Receta sin una proteína principal claramente definida."],
];
icons.getRange("A3:D3").format = {
  fill: colors.mandarin,
  font: { name: "Inter", bold: true, color: colors.ink },
};
icons.getRange("A4:D15").format = {
  font: { name: "Inter", size: 10, color: colors.ink },
  wrapText: true,
  verticalAlignment: "center",
  borders: { insideHorizontal: { style: "thin", color: colors.line } },
};
icons.getRange("A3:D15").format.borders = { preset: "outside", style: "thin", color: colors.line };
icons.getRange("A:A").format.columnWidth = 20;
icons.getRange("B:B").format.columnWidth = 24;
icons.getRange("C:C").format.columnWidth = 22;
icons.getRange("D:D").format.columnWidth = 54;
icons.getRange("C4:C15").format = {
  font: { name: "Segoe UI Emoji", size: 18 },
  horizontalAlignment: "center",
};
icons.getRange("A17:D18").merge();
icons.getRange("A17").values = [[
  "Para insertar otros emojis en Windows: presiona Windows + . (punto). Los tres campos de proteína son opcionales si la receta no tiene una fuente principal clara."
]];
icons.getRange("A17:D18").format = {
  fill: colors.paper,
  font: { name: "Inter", size: 10, color: colors.muted },
  wrapText: true,
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: colors.line },
};

const inspect = await wb.inspect({
  kind: "table",
  range: "Recetas!A1:W5",
  include: "values,formulas",
  tableMaxRows: 5,
  tableMaxCols: 23,
});
console.log(inspect.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

for (const [sheetName, range, file] of [
  ["Instrucciones", "A1:C16", "preview_instrucciones.png"],
  ["Recetas", "A1:W5", "preview_recetas.png"],
  ["Catalogos", "A1:B5", "preview_catalogos.png"],
  ["Ejemplo JSON", "A1:H30", "preview_json.png"],
  ["Fotos branding", "A1:F43", "preview_fotos_branding.png"],
  ["Iconos proteína", "A1:D18", "preview_iconos.png"],
]) {
  const preview = await wb.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${file}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(`${outputDir}/Plantilla_recetas_para_Supabase.xlsx`);
