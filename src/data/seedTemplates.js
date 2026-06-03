/**
 * Evaluation template seed — 17 Zoho-migrated templates (batch 1 + batch 2).
 *
 * Structure per template:
 *   category, title_en, title_ar, questions[]
 *
 * Question types: rating_1_5 | rating_0_10 | rating_0_100 | text | boolean | choice | file
 *
 * To add more templates, copy an object into evaluationTemplatesSeed and upsert to Supabase.
 */
import { evaluationTemplatesSeedBatch1 } from "./evaluationTemplatesSeedBatch1.js";
import { evaluationTemplatesSeedBatch2 } from "./evaluationTemplatesSeedBatch2.js";

export { evaluationTemplatesSeedBatch1, evaluationTemplatesSeedBatch2 };

export const TEMPLATE_QUESTIONS_SCHEMA_VERSION = 2;

/** All 17 evaluation templates (10 + 7). */
export const evaluationTemplatesSeed = [
  ...evaluationTemplatesSeedBatch1,
  ...evaluationTemplatesSeedBatch2,
];

/** @deprecated Use evaluationTemplatesSeed */
export const SEED_EVALUATION_TEMPLATES = evaluationTemplatesSeed.map(mapSeedTemplateToDbRow);

export function mapSeedTemplateToDbRow(template) {
  return {
    category: template.category,
    title: template.title_ar,
    questions_jsonb: {
      version: TEMPLATE_QUESTIONS_SCHEMA_VERSION,
      title_en: template.title_en,
      title_ar: template.title_ar,
      questions: template.questions,
    },
  };
}

export function mapAllSeedTemplatesToDbRows() {
  return evaluationTemplatesSeed.map(mapSeedTemplateToDbRow);
}

export function templateToSqlValues(template) {
  const row = mapSeedTemplateToDbRow(template);
  return {
    category: row.category,
    title: row.title,
    questions_jsonb: JSON.stringify(row.questions_jsonb),
  };
}
