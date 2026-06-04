import { supabase } from "./supabaseClient.js";
import { isMissingColumnError } from "./supabaseErrors.js";
import { resolveTemplateContentPayload } from "./evaluationTemplateContent.js";
import { mapAllSeedTemplatesToDbRows } from "../data/seedTemplates.js";

export { resolveTemplateContentPayload };

const TEMPLATE_SELECT_ATTEMPTS = [
  "id, category, title, criteria",
  "id, category, title, questions",
  "id, category, title, content",
  "id, category, title, questions_jsonb",
  "id, category, title",
];

const TEMPLATE_EMBED_SELECT_ATTEMPTS = [
  "id, title, criteria",
  "id, title, questions",
  "id, title, content",
  "id, title, questions_jsonb",
  "id, title",
];

export function normalizeEvaluationTemplateRow(row, seedByTitle = new Map()) {
  if (!row) return null;

  const title = String(row.title ?? "").trim();
  let seed = seedByTitle.get(title);
  if (!seed && title) {
    for (const [seedTitle, seedRow] of seedByTitle) {
      if (title.includes(seedTitle) || seedTitle.includes(title)) {
        seed = seedRow;
        break;
      }
    }
  }
  const content =
    resolveTemplateContentPayload(row) ??
    (seed ? resolveTemplateContentPayload(seed) : null) ??
    seed?.questions_jsonb ??
    null;

  return {
    ...row,
    category: row.category ?? seed?.category,
    title: title || seed?.title,
    criteria: row.criteria ?? content,
    questions: row.questions ?? content,
    content: row.content ?? content,
    questions_jsonb: content,
  };
}

function buildSeedTitleMap() {
  const map = new Map();
  for (const seed of mapAllSeedTemplatesToDbRows()) {
    map.set(String(seed.title).trim(), seed);
  }
  return map;
}

async function queryTemplatesWithSelect(selectClause) {
  return supabase
    .from("evaluation_templates")
    .select(selectClause)
    .order("category", { ascending: true })
    .order("title", { ascending: true });
}

export async function fetchEvaluationTemplateRows() {
  let lastError = null;

  for (const selectClause of TEMPLATE_SELECT_ATTEMPTS) {
    const { data, error } = await queryTemplatesWithSelect(selectClause);
    if (!error) {
      const seedMap = buildSeedTitleMap();
      return (data ?? []).map((row) => normalizeEvaluationTemplateRow(row, seedMap));
    }
    lastError = error;
    if (!isMissingColumnError(error)) break;
  }

  throw lastError ?? new Error("تعذّر تحميل نماذج التقييم.");
}

export async function fetchEvaluationTemplateById(templateId) {
  const id = Number(templateId);
  if (!id) return null;

  let lastError = null;

  for (const selectClause of TEMPLATE_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("evaluation_templates")
      .select(selectClause)
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      const seedMap = buildSeedTitleMap();
      return normalizeEvaluationTemplateRow(data, seedMap);
    }
    lastError = error;
    if (!isMissingColumnError(error)) break;
  }

  throw lastError ?? new Error("تعذّر تحميل نموذج التقييم.");
}

/** PostgREST embed fragment for evaluation_templates FK selects. */
export function getEvaluationTemplateEmbedSelect() {
  return TEMPLATE_EMBED_SELECT_ATTEMPTS[0];
}

export function normalizeEmbeddedTemplate(template) {
  if (!template) return template;
  const seedMap = buildSeedTitleMap();
  return normalizeEvaluationTemplateRow(template, seedMap);
}
