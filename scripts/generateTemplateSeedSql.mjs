#!/usr/bin/env node
/**
 * Generates SQL to upsert all templates from seedTemplates.js
 * Usage: node scripts/generateTemplateSeedSql.mjs
 */
import { mapAllSeedTemplatesToDbRows } from "../src/data/seedTemplates.js";

const rows = mapAllSeedTemplatesToDbRows();

console.log(`-- Auto-generated from src/data/seedTemplates.js (${rows.length} templates)
create unique index if not exists evaluation_templates_title_unique
  on public.evaluation_templates (title);

`);

for (const row of rows) {
  const category = row.category.replace(/'/g, "''");
  const title = row.title.replace(/'/g, "''");
  const json = JSON.stringify(row.questions_jsonb).replace(/'/g, "''");

  console.log(`insert into public.evaluation_templates (category, title, questions_jsonb)
select '${category}', '${title}', '${json}'::jsonb
where not exists (
  select 1 from public.evaluation_templates t where t.title = '${title}'
);

update public.evaluation_templates
set category = '${category}',
    questions_jsonb = '${json}'::jsonb
where title = '${title}';

`);
}
