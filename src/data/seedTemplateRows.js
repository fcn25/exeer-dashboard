/**
 * Maps raw Zoho seed batches to DB rows — kept separate from seedTemplates.js
 * so evaluationTemplateDb does not pull in eager module-level seed evaluation.
 */
import { evaluationTemplatesSeed } from "./seedEvaluationData.js";
import {
  getTemplatePreviewSections,
  TEMPLATE_UI_SEED_TITLE_AR,
} from "../constants/performanceTemplates.js";
import { buildTemplateCategoriesPayload } from "../utils/evaluationTemplateStructure.js";
import { flattenTemplateQuestionRecords } from "../utils/evaluationTemplateFlatten.js";
import { TEMPLATE_STRUCTURE_VERSION } from "../utils/evaluationTemplateTypes.js";

export const TEMPLATE_QUESTIONS_SCHEMA_VERSION = TEMPLATE_STRUCTURE_VERSION;

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

let cachedSeedEvaluationTemplates = null;

/** Lazy — avoids TDZ when evaluationTemplateDb loads before seed mappers finish. */
export function getSeedEvaluationTemplates() {
  if (!cachedSeedEvaluationTemplates) {
    cachedSeedEvaluationTemplates = mapAllSeedTemplatesToDbRows();
  }
  return cachedSeedEvaluationTemplates;
}
