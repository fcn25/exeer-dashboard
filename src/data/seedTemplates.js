/**
 * Evaluation template seed — 17 Zoho-migrated templates (batch 1 + batch 2).
 *
 * Stored shape (questions_jsonb v3):
 *   categories[] → criteria[] → questions[] (full Zoho question objects)
 */
import { evaluationTemplatesSeedBatch1 } from "./evaluationTemplatesSeedBatch1.js";
import { evaluationTemplatesSeedBatch2 } from "./evaluationTemplatesSeedBatch2.js";
import {
  getTemplatePreviewSections,
  TEMPLATE_UI_SEED_TITLE_AR,
} from "../constants/performanceTemplates.js";
import {
  buildTemplateCategoriesPayload,
  TEMPLATE_STRUCTURE_VERSION,
} from "../utils/evaluationTemplateStructure.js";
import { flattenTemplateQuestionRecords } from "../utils/evaluationTemplateQuestions.js";

export { evaluationTemplatesSeedBatch1, evaluationTemplatesSeedBatch2 };

export const TEMPLATE_QUESTIONS_SCHEMA_VERSION = TEMPLATE_STRUCTURE_VERSION;

/** All 17 evaluation templates (10 + 7). */
export const evaluationTemplatesSeed = [
  ...evaluationTemplatesSeedBatch1,
  ...evaluationTemplatesSeedBatch2,
];

function resolveUiTemplateId(titleAr) {
  const normalized = String(titleAr ?? "").trim();
  if (!normalized) return null;

  for (const [uiId, seedTitle] of Object.entries(TEMPLATE_UI_SEED_TITLE_AR)) {
    if (seedTitle === normalized) return uiId;
  }

  for (const [uiId, seedTitle] of Object.entries(TEMPLATE_UI_SEED_TITLE_AR)) {
    if (normalized.includes(seedTitle) || seedTitle.includes(normalized)) {
      return uiId;
    }
  }

  return null;
}

/** @deprecated Use evaluationTemplatesSeed */
export const SEED_EVALUATION_TEMPLATES = evaluationTemplatesSeed.map(mapSeedTemplateToDbRow);

export function mapSeedTemplateToDbRow(template) {
  const uiTemplateId = resolveUiTemplateId(template.title_ar);
  const previewSections = uiTemplateId
    ? getTemplatePreviewSections({ id: uiTemplateId })
    : [];

  const categories = buildTemplateCategoriesPayload({
    previewSections,
    flatQuestions: template.questions ?? [],
  });

  const questions_jsonb = {
    version: TEMPLATE_QUESTIONS_SCHEMA_VERSION,
    title_en: template.title_en,
    title_ar: template.title_ar,
    categories,
    questions: flattenTemplateQuestionRecords({ categories }),
  };

  return {
    category: template.category,
    title: template.title_ar,
    questions_jsonb,
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
