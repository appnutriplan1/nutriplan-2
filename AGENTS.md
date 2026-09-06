# NutriPlan — Contexto Maestro (handoff para Codex)

> Lee este archivo primero. Resume TODO el contexto del proyecto para poder construir sin volver a preguntar.
> Documentos hermanos: `NutriCook-UX-Blueprint.md` (diseño detallado) y `/Moodboard` (referencias Dribbble + Design Library con la paleta y tipografía).

## Qué es
PWA para los pacientes de Joel Flores (nutricionista). Reemplaza el envío de planes por WhatsApp. Cada paciente accede a su plan (ebook descargable), su seguimiento y calculadoras. **Debe sentirse editorial premium (Apple Books + Spotify + revista), NO app médica ni look genérico de IA.** Todo lo visual sale del moodboard, no inventado.

## Stack
React + Vite + TypeScript + Tailwind CSS + Framer Motion. PWA (instalable, offline para recursos cacheados, service worker). Iconos: Lucide. PDF: pdf.js.

## Arquitectura de datos (regla de oro)
`React → DataService → Google Apps Script (Web App) → Google Sheets → (futuro) Supabase/PostgreSQL`
- El frontend NUNCA toca Google Sheets ni ve API keys / service accounts.
- Apps Script valida el código de acceso, filtra y devuelve SOLO la fila autorizada.
- Toda lectura pasa por `DataService` para poder migrar a Supabase sin tocar la UI.
- Archivos (PDFs de planes) viven en Google Drive privado; en Sheets solo se guarda el link.

## Modelo de datos (cerrado). Cada hoja tiene `id` sustituto.
- **PACIENTES**: id, codigo_acceso (aleatorio tipo `nc_8fK3-Qm2P-Zx91`, revocable), estado (ACTIVO/SUSPENDIDO/REVOCADO/EXPIRADO), nombre, correo, sexo (M/F), fecha_nacimiento, talla_cm, objetivo, fecha_actualizacion, notas.
- **PLANES**: id, paciente_id (FK), titulo, url_pdf, estado (VIGENTE/ARCHIVADO), fecha_inicio, fecha_fin, kcal_objetivo, proteinas_g, carbohidratos_g, grasas_g. HAY HISTORIAL: la paciente ve planes pasados.
- **SEGUIMIENTO**: id, paciente_id (FK), fecha, peso_kg, cintura_cm, notas. Serie temporal para progreso. IMC se calcula, no se guarda.
- **ALIMENTOS**: id (código CENAN), nombre, grupo, energia_kcal, proteinas_g, grasa_g, carbohidratos_g, +otros. Valores por 100 g. Es la Tabla Peruana de Composición de Alimentos (CENAN/INS): conseguir oficial, limpiar a CSV, importar.
- **CONFIG**: clave/valor (link_whatsapp, link_agenda).
Relaciones: PACIENTES 1─N PLANES, PACIENTES 1─N SEGUIMIENTO.

## Acceso (dos niveles)
- **Registrada** (código válido + ACTIVO): plan, historial, seguimiento, calculadoras.
- **Visitante** (sin código): solo calculadoras. Al intentar entrar a lo privado → muro cálido "no estás registrada" + botón "Agendar consulta" (link WhatsApp/agenda). Las calculadoras son el gancho de captación.

## Design tokens (de /Moodboard/NutriCook-DesignLibrary.html — cargar en tailwind.config)
Colores: crema #FAF7F2 (fondo), papel #F1EBE1 (superficies), tinta #1A1A17 (texto/dark bg), verde #1F4A3F (marca), sage #6B8F7D, coral #FF6B4A (CTA único por pantalla), mandarina #F2A65A (acento cálido), linea #E4DCCF (bordes), muted #7A7468 (texto 2º).
Tipografía: display/titulares = **Fraunces** (serif editorial); lectura larga/ebook = **Newsreader** o Source Serif 4; UI = **Inter**. Kicker de marca: mayúsculas, letter-spacing .28em, mandarina.
Radios 16–20px cards / 12px botones-inputs / pill chips. Sombras suaves tintadas verde: `0 8px 24px rgba(31,74,63,.06)`. Espaciado generoso (mucho aire). Carga = skeleton shimmer, NUNCA spinners.

## Pantallas (detalle completo en UX Blueprint)
Entrada por código · Muro visitante · Home tipo Spotify (filas, no gráficos) · Visor ebook (pdf.js + pase de página + sonido con mute + descarga PDF + modo oscuro; el plan se diseña VERTICAL de celular ~1080×1920, NO A4) · Historial de planes · Seguimiento (IMC número grande + gauge + tendencia de peso + macros en donut) · Calculadora clínica (Mifflin-St Jeor, resultado en vivo) · Calculadora por alimentos (command palette ⌘K + builder con total en vivo desde ALIMENTOS) · Panel admin (solo Joel: CRUD pacientes/planes, generar código, subir PDF).

Responsive: móvil = bottom nav 4–5 ítems + FAB central (prioritario para pacientes); desktop = sidebar colapsable (admin).

## Orden de construcción
1) Fundaciones (Vite+PWA+Tailwind con tokens, Lucide, componentes base con estados). 2) Calculadoras (públicas). 3) Capa de datos (Apps Script + DataService + login por código + muro). 4) Home + Visor ebook. 5) Seguimiento. 6) Admin. 7) Pulido (skeletons, microinteracciones, dark mode lectura, responsive).

## Imported Claude Cowork project instructions
