# NutriPlan

PWA para los pacientes de Joel Flores (nutricionista). Reemplaza el envío de
planes por WhatsApp: cada paciente entra con un código de acceso y ve su
plan (como un ebook), su historial, su seguimiento y dos calculadoras
públicas. Editorial premium — Apple Books + Spotify — no "app médica".

Para el día a día de administración (dar de alta pacientes, subir planes,
registrar controles) ver **[NutriCook-Guia-Operacion.md](./NutriCook-Guia-Operacion.md)**
— no hace falta tocar código.

## Stack

React + Vite + TypeScript + Tailwind CSS v4 + Framer Motion. PWA instalable
(manifest + service worker vía `vite-plugin-pwa`). PDF del plan renderizado
con `pdf.js`. Iconos: `lucide-react`.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173, modo mock por defecto
```

Otros comandos:

```bash
npm run build    # type-check (tsc) + build de producción a dist/
npm run lint     # oxlint
npm run preview  # sirve el build de dist/ localmente
```

No hace falta ninguna variable de entorno para desarrollar: sin `.env`, la
app arranca igual en **modo mock** (datos de ejemplo, sin backend). Para
probar el login, usa el código `nc_DEMO-0001` (aparece como hint en la
pantalla de entrada mientras estés en modo mock).

## Estructura de carpetas

```
apps-script/              Código de Google Apps Script (NO se compila con la app)
  Codigo.gs                proxy seguro: valida código de acceso, sirve solo
                            la fila de esa paciente + sus planes/seguimiento
  generarCodigos.gs         función para generar códigos de acceso nuevos

public/
  sample-plans/plan-demo.pdf   PDF placeholder vertical (~1080×1920) para
                                probar el visor en modo mock
  icons/                        íconos de la PWA

src/
  components/              Design system: Button, Input, Card, Chip,
                            Skeleton, Donut, BmiGauge, Slider, PlanCover…
  context/AuthContext.tsx  Estado de sesión (visitante | paciente)
  data/                    Fixtures de modo mock (misma forma que Apps
                            Script devuelve, para que dataService use el
                            mismo mapeo en ambos modos)
  features/                Una carpeta por pantalla (entrada, home, visor,
                            seguimiento, perfil, calculadoras, muro, nav…)
  lib/                     Funciones puras: calculadora clínica (Mifflin-St
                            Jeor, IMC), edad, pdf.js, utilidades
  routes/RutaPrivada.tsx   Wrapper de rutas privadas (muestra el muro de
                            acceso a quien no tiene sesión)
  services/
    dataService.ts          ÚNICA puerta a datos remotos (ver más abajo)
    alimentosService.ts      búsqueda/filtro sobre dataService.listAlimentos()
```

## Arquitectura de datos

```
React → dataService.ts → Apps Script (Codigo.gs) → Google Sheets
```

El frontend **nunca** toca Google Sheets ni ve credenciales. Todo lo que un
componente necesita pasa por `src/services/dataService.ts` — es la única
función con permiso de saber si los datos vienen de fixtures locales o de
la hoja real.

**Excepción deliberada: la tabla de alimentos.** La Tabla Peruana de
Composición de Alimentos (CENAN/INS) es una referencia oficial y fija, no
un dato operativo, así que viaja dentro del bundle
(`src/data/alimentos.tabla.ts`, generado desde
`datos/tabla_peruana_alimentos.csv`) y no pasa por Apps Script. Es
instantánea, funciona sin conexión y no puede romperse por una edición
accidental de la hoja — que es exactamente lo que ocurrió: al pegar la
tabla, Sheets interpretó los decimales como fechas ("12.8" g de proteína
quedó guardado como "12 de agosto") y la calculadora mostraba `NaN`.
Sigue entrando por `dataService.listAlimentos()`, así que ningún componente
se entera. Ningún componente de UI importa datos mock directamente ni
sabe en qué modo está corriendo (salvo dos textos de ayuda cosméticos en
Entrada y Perfil, gateados por `isMockMode`, que simplemente desaparecen en
modo remoto).

## Pasar de mock a remoto

La app ya corre en modo remoto contra la hoja real (`VITE_DATA_MODE=remote`).
Estos son los pasos por si hay que rehacer la conexión desde cero:

1. **Crea el Google Sheet** con las 5 pestañas (`PACIENTES`, `PLANES`,
   `SEGUIMIENTO`, `ALIMENTOS`, `CONFIG`) — la estructura exacta de columnas
   está comentada arriba de [`apps-script/Codigo.gs`](./apps-script/Codigo.gs).
2. **Despliega `Codigo.gs`**: Extensiones → Apps Script en ese Sheet, pega
   el archivo completo, reemplaza `SPREADSHEET_ID` por el ID real de la
   hoja, y Deploy → New deployment → Web app (Execute as: *Me*, Who has
   access: *Anyone*). Copia la URL que te da el deploy. (Los pasos
   detallados están comentados al final del propio archivo.)
3. **Crea tu `.env`** a partir de `.env.example`:
   ```bash
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_ID/exec
   VITE_DATA_MODE=remote
   VITE_WHATSAPP_LINK=https://wa.me/51...
   VITE_AGENDA_LINK=https://calendly.com/...
   ```
4. Reinicia `npm run dev` (o rehaz el build). Listo — **no se toca ningún
   componente**. `dataService.ts` empieza a llamar al Web App de Apps
   Script en vez de servir los fixtures de `src/data/`.
5. (Opcional) usa [`apps-script/generarCodigos.gs`](./apps-script/generarCodigos.gs)
   para generarle un código de acceso a cada paciente que des de alta.

Para el trabajo del día a día una vez conectado (altas, planes, controles,
suspender/revocar acceso), sigue la
**[Guía de operación](./NutriCook-Guia-Operacion.md)**.

## Notas de seguridad

- El código de acceso viaja por `POST` con `Content-Type: text/plain`
  (evita el preflight CORS que Apps Script no sabe responder) — nunca por
  la URL.
- `Codigo.gs` nunca devuelve la hoja completa: solo la fila de la paciente
  validada + sus propios planes/seguimiento, filtrados por `paciente_id`.
- Un código inválido, suspendido, revocado o expirado devuelve siempre el
  mismo error genérico (`ACCESO_DENEGADO`) — nunca se filtra por qué fue
  rechazado.
- Las calculadoras (clínica y por alimentos) son públicas a propósito: son
  el gancho de captación para visitantes sin código.
