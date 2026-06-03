-- Predefined evaluation questions per template (Zoho migration target)

alter table public.evaluation_templates
  add column if not exists questions_jsonb jsonb not null default '{"version":1,"questions":[]}'::jsonb;

create index if not exists evaluation_templates_questions_gin_idx
  on public.evaluation_templates using gin (questions_jsonb);

-- Mock templates with sample questions (client can copy this structure for all 17 Zoho templates)
insert into public.evaluation_templates (category, title, questions_jsonb)
select
  seed.category,
  seed.title,
  seed.questions_jsonb::jsonb
from (
  values
    (
      'Customer Experience',
      'Customer Service Evaluation',
      '{
        "version": 1,
        "questions": [
          {
            "id": "cs_communication",
            "type": "rating",
            "text": "جودة التواصل مع العملاء",
            "textEn": "Quality of customer communication",
            "min": 1,
            "max": 5,
            "required": true
          },
          {
            "id": "cs_problem_solving",
            "type": "rating",
            "text": "سرعة وفعالية حل المشكلات",
            "textEn": "Problem-solving speed and effectiveness",
            "min": 1,
            "max": 5,
            "required": true
          },
          {
            "id": "cs_feedback",
            "type": "text",
            "text": "ملاحظات أو أمثلة على تفاعلات متميزة",
            "textEn": "Feedback or examples of outstanding interactions",
            "multiline": true,
            "required": false
          }
        ]
      }'
    ),
    (
      'Leadership',
      'General Manager Evaluation',
      '{
        "version": 1,
        "questions": [
          {
            "id": "gm_vision",
            "type": "rating",
            "text": "وضوح الرؤية والتوجيه الاستراتيجي",
            "textEn": "Clarity of vision and strategic direction",
            "min": 1,
            "max": 5,
            "required": true
          },
          {
            "id": "gm_decision_making",
            "type": "rating",
            "text": "جودة اتخاذ القرارات",
            "textEn": "Quality of decision-making",
            "min": 1,
            "max": 5,
            "required": true
          },
          {
            "id": "gm_development_notes",
            "type": "text",
            "text": "مجالات التطوير القيادي المقترحة",
            "textEn": "Suggested leadership development areas",
            "multiline": true,
            "required": false
          }
        ]
      }'
    )
) as seed(category, title, questions_jsonb)
where not exists (
  select 1
  from public.evaluation_templates existing
  where existing.title = seed.title
);
