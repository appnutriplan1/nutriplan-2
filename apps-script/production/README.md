# Apps Script de produccion

Esta carpeta es la unica fuente desplegable de NutriPlan.

Reglas:

1. No copiar archivos `parche-*` al proyecto de Google Apps Script.
2. No desplegar `Codigo-COMPLETO.gs` ni archivos fuera de esta carpeta.
3. Cada nombre de funcion debe existir una sola vez en todo el proyecto.
4. Toda version debe responder `estado_servicio` con su identificador.
5. Antes de publicar, ejecutar `npm run validate:apps-script`.
6. Produccion utiliza una sola URL mediante `APPS_SCRIPT_URL`.

Modulos:

- `Codigo.gs`: router, autenticacion de pacientes, lectura segura y PDFs.
- `AdminPanel.gs`: operaciones privadas del panel.
- `CiclosPlan.gs`: periodos y semanas de planes.
- `NotificacionesPush.gs`: suscripciones y recordatorios push.
- `Rutinas.gs`: lectura de rutinas asignadas.
- `HerramientasCodigos.gs`: utilidades manuales para codigos de pacientes.

Las 100 recetas publicas se sirven desde Supabase. Esta instalacion no incluye
suscripciones ni modulos corporativos.
