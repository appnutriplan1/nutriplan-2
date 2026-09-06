import { readFile, writeFile } from 'node:fs/promises'

const recipes = JSON.parse(await readFile(new URL('../supabase/seed-recipes.json', import.meta.url), 'utf8'))
const payload = JSON.stringify(recipes).replaceAll('$recipes$', '$ recipes $')
const sql = `insert into public.recipes
select * from jsonb_populate_recordset(null::public.recipes, $recipes$${payload}$recipes$::jsonb)
on conflict (id) do nothing;

select count(*) as recetas_gratuitas
from public.recipes
where estado = 'GRATUITO' and visible is true;
`

await writeFile(new URL('../supabase/seed-recipes.sql', import.meta.url), sql)
console.log(`SQL de semilla generado para ${recipes.length} recetas.`)
