import { supabase } from "../utils/supabaseClient.js";

const EVALUATION_CRITERIA = [
  { key: "quality_of_work", label: "جودة العمل", labelEn: "Quality of Work" },
  { key: "communication", label: "التواصل", labelEn: "Communication" },
  { key: "punctuality", label: "الالتزام بالمواعيد", labelEn: "Punctuality" },
  { key: "teamwork", label: "العمل الجماعي", labelEn: "Teamwork" },
  { key: "initiative", label: "المبادرة", labelEn: "Initiative" },
];

const QUESTION_TYPES = {
  RATING_1_5: "rating_1_5",
  RATING: "rating",
  TEXT: "text",
  BOOLEAN: "boolean",
  CHOICE: "choice",
  FILE: "file",
};

function parseJsonValue(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function resolveTemplateContentPayload(row) {
  if (!row) return null;

  const raw =
    row.questions_jsonb ?? row.criteria ?? row.questions ?? row.content ?? null;
  const parsed = parseJsonValue(raw) ?? raw;
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    return { version: 3, categories: parsed };
  }

  if (typeof parsed === "object") {
    if (Array.isArray(parsed.categories)) return parsed;
    if (Array.isArray(parsed.criteria)) {
      return { version: 3, categories: parsed };
    }
    if (Array.isArray(parsed.questions)) return parsed;
  }

  return null;
}

function normalizeEmbeddedTemplateRow(row) {
  if (!row) return { id: null, title: "نموذج تقييم", questions_jsonb: null };
  const content = resolveTemplateContentPayload(row);
  return {
    ...row,
    questions_jsonb: content ?? row.questions_jsonb ?? null,
  };
}

export function getEvaluationTemplateEmbedSelect() {
  return "id, title, questions_jsonb";
}

export function normalizeEmbeddedTemplate(template) {
  return normalizeEmbeddedTemplateRow(template);
}

export async function fetchEvaluationTemplateRows() {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("id, title, category, questions_jsonb")
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(normalizeEmbeddedTemplateRow);
}

export async function fetchEvaluationTemplateById(templateId) {
  const id = Number(templateId);
  if (!id) return null;

  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("id, title, category, questions_jsonb")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return normalizeEmbeddedTemplateRow(data);
}

export function calculateEvaluationScore(answers) {
  const ratings = EVALUATION_CRITERIA.map((c) =>
    Number(answers?.[c.key] ?? 0),
  ).filter((value) => value >= 1 && value <= 5);
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

export function buildEvaluationAnswersPayload(ratings, generalComments) {
  return {
    ...ratings,
    general_comments: String(generalComments ?? "").trim(),
  };
}

export { EVALUATION_CRITERIA };

function isRatingQuestionType(type) {
  return type === QUESTION_TYPES.RATING_1_5 || type === QUESTION_TYPES.RATING;
}

function getRatingBounds(question) {
  if (question.type === QUESTION_TYPES.RATING_1_5) {
    return { min: 1, max: 5 };
  }
  return {
    min: Number(question.min ?? 1),
    max: Number(question.max ?? 5),
  };
}

function normalizeQuestion(item, lang = "ar") {
  return {
    id: item.id,
    type: item.type ?? QUESTION_TYPES.TEXT,
    text: lang === "en" && item.text_en ? item.text_en : item.text_ar ?? item.text ?? "",
    required: item.required !== false,
    min: item.min,
    max: item.max,
  };
}

function flattenTemplateQuestionRecords(source) {
  if (!source) return [];
  if (Array.isArray(source.questions)) return source.questions;
  if (!Array.isArray(source.categories)) return [];

  const records = [];
  for (const category of source.categories) {
    const questions = category?.questions ?? category?.criteria ?? [];
    for (const question of questions) {
      records.push(question);
    }
  }
  return records;
}

function getTemplatePayload(template) {
  return resolveTemplateContentPayload(template) ?? template?.questions_jsonb ?? null;
}

export function parseTemplateQuestions(templateOrPayload, lang = "ar") {
  const source =
    templateOrPayload?.title != null
      ? getTemplatePayload(templateOrPayload)
      : templateOrPayload;

  return flattenTemplateQuestionRecords(source)
    .filter((item) => item?.id && item?.type)
    .map((item) => normalizeQuestion(item, lang));
}

export function getLegacyDefaultQuestions(lang = "ar") {
  return [
    ...EVALUATION_CRITERIA.map((criterion) =>
      normalizeQuestion(
        {
          id: criterion.key,
          type: QUESTION_TYPES.RATING_1_5,
          text_ar: criterion.label,
          text_en: criterion.labelEn,
        },
        lang,
      ),
    ),
    normalizeQuestion(
      {
        id: "general_comments",
        type: QUESTION_TYPES.TEXT,
        text_ar: "ملاحظات عامة",
        text_en: "General comments",
        required: false,
      },
      lang,
    ),
  ];
}

export function resolveEvaluationQuestions(template, lang = "ar") {
  const parsed = parseTemplateQuestions(getTemplatePayload(template), lang);
  return parsed.length > 0 ? parsed : getLegacyDefaultQuestions(lang);
}

function isEmptyAnswer(question, value) {
  if (isRatingQuestionType(question.type)) {
    const numeric = Number(value);
    const { min } = getRatingBounds(question);
    return !numeric || numeric < min;
  }
  if (question.type === QUESTION_TYPES.TEXT) {
    return !String(value ?? "").trim();
  }
  if (question.type === QUESTION_TYPES.BOOLEAN) {
    return value !== true && value !== false;
  }
  if (question.type === QUESTION_TYPES.CHOICE) {
    return !String(value ?? "").trim();
  }
  if (question.type === QUESTION_TYPES.FILE) {
    return !value || !value.name;
  }
  return false;
}

export function validateTemplateAnswers(questions, answers) {
  for (const question of questions) {
    if (!question.required) continue;
    if (isEmptyAnswer(question, answers?.[question.id])) {
      return `يرجى إكمال: ${question.text}`;
    }
  }
  return null;
}

export function calculateDynamicEvaluationScore(questions, answers) {
  const ratingQuestions = questions.filter((q) => isRatingQuestionType(q.type));
  const normalizedScores = ratingQuestions
    .map((question) => {
      const value = Number(answers?.[question.id] ?? NaN);
      const { min, max } = getRatingBounds(question);
      if (Number.isNaN(value) || value < min || value > max) return null;
      if (max <= 5) return value;
      return (value / max) * 5;
    })
    .filter((value) => value != null);

  if (normalizedScores.length === 0) return null;
  const sum = normalizedScores.reduce((total, value) => total + value, 0);
  return Math.round((sum / normalizedScores.length) * 100) / 100;
}

export function formatAnswersForSummary(questions, answers) {
  const lines = [];
  questions.forEach((question) => {
    const value = answers?.[question.id];
    if (value == null || value === "") return;

    if (isRatingQuestionType(question.type)) {
      const { max } = getRatingBounds(question);
      lines.push(`- ${question.text}: ${value}/${max}`);
    } else if (question.type === QUESTION_TYPES.BOOLEAN) {
      lines.push(`- ${question.text}: ${value ? "نعم" : "لا"}`);
    } else if (question.type === QUESTION_TYPES.FILE) {
      lines.push(`- ${question.text}: ${value?.name ?? "مرفق"}`);
    } else {
      lines.push(`- ${question.text}: ${String(value).trim()}`);
    }
  });
  return lines;
}

export function normalizeAnswersPayload(questions, rawAnswers) {
  const payload = {};
  questions.forEach((question) => {
    const value = rawAnswers?.[question.id];
    if (isRatingQuestionType(question.type)) {
      payload[question.id] = Number(value ?? 0);
    } else if (question.type === QUESTION_TYPES.BOOLEAN) {
      payload[question.id] = Boolean(value);
    } else if (question.type === QUESTION_TYPES.FILE) {
      payload[question.id] = value ?? null;
    } else {
      payload[question.id] = String(value ?? "").trim();
    }
  });
  return payload;
}
