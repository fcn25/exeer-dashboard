-- Store AI-generated executive summary per evaluation cycle

alter table public.evaluation_cycles
  add column if not exists ai_summary text;
