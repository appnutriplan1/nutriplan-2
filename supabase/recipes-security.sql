-- NutriPlan · separación entre catálogo público y contenido premium
--
-- El endpoint privado ya existe en api/receta.ts. Antes de ejecutar:
--   1. configurar SUPABASE_SERVICE_ROLE_KEY y SUPABASE_URL en el servidor;
--   2. probar /api/receta en el entorno de destino;
--   3. recién entonces aplicar esta transacción.
--
-- Objetivo:
--   1. El público puede consultar únicamente recipe_catalog.
--   2. anon/authenticated no pueden leer public.recipes directamente.
--   3. Solo el backend con service_role recupera ingredientes y preparación.

begin;

create or replace view public.recipe_catalog
with (security_barrier = true)
as
select
  id,
  numero,
  titulo,
  categoria_id,
  categoria_nombre,
  descripcion,
  imagen_principal,
  tiempo_minutos,
  dificultad,
  porciones,
  nutricion,
  tags,
  proteina_principal,
  estado
from public.recipes;

comment on view public.recipe_catalog is
  'Ficha pública de recetas. Excluye ingredientes, pasos y tips_del_chef.';

revoke all on table public.recipes from anon, authenticated;
grant select on public.recipe_catalog to anon, authenticated;

alter table public.recipes enable row level security;

-- No se crea una política SELECT para anon/authenticated a propósito.
-- El rol service_role del endpoint privado ignora RLS.

commit;
