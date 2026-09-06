create table if not exists public.recipes (
  id text primary key,
  numero integer not null,
  titulo text not null,
  categoria_id text not null,
  categoria_nombre text not null,
  descripcion text not null default '',
  imagen_principal text not null default '',
  tiempo_minutos integer not null default 30 check (tiempo_minutos > 0),
  dificultad text not null default 'Fácil',
  porciones integer not null default 1 check (porciones > 0),
  nutricion jsonb not null default '{}'::jsonb,
  ingredientes jsonb not null default '[]'::jsonb,
  pasos jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  tips_del_chef jsonb not null default '[]'::jsonb,
  proteina_principal jsonb,
  estado text not null default 'GRATUITO' check (estado = 'GRATUITO'),
  mostrar_a_pacientes boolean not null default true,
  visible boolean not null default true,
  orden integer not null,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

revoke all on table public.recipes from anon, authenticated;
grant select, insert, update, delete on table public.recipes to service_role;

create index if not exists recipes_visible_order_idx
  on public.recipes (visible, orden);

comment on table public.recipes is
  'Catálogo cerrado de las 100 recetas gratuitas de NutriPlan 1. Solo lo consulta el backend con service_role.';
