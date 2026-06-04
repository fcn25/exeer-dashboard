import {
  EVALUATION_CRITERIA,
  EMPTY_RATINGS,
} from "../constants/evaluationCriteria.js";
import { resolveTemplateContentPayload } from "./evaluationTemplateContent.js";
import { flattenTemplateQuestionRecords } from "./evaluationTemplateFlatten.js";
import {
  getQuestionLabel,
  getRatingBounds,
  isRatingQuestionType,
  normalizeQuestion,
} from "./evaluationTemplateQuestionHelpers.js";
import { QUESTION_TYPES } from "./evaluationTemplateTypes.js";

export { QUESTION_TYPES } from "./evaluationTemplateTypes.js";
export {
  getQuestionLabel,
  getChoiceOptions,
  getRatingBounds,
  isQuestionRequired,
  isRatingQuestionType,
  normalizeQuestion,
  getTemplateCategoryLabelAr,
  getQuestionRatingHintAr,
  mapQuestionToPreviewDetail,
} from "./evaluationTemplateQuestionHelpers.js";
export { flattenTemplateQuestionRecords } from "./evaluationTemplateFlatten.js";

export function getTemplatePayload(template) {
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

export function getTemplateDisplayTitle(template, lang = "ar") {
  const payload = getTemplatePayload(template);
  if (payload && typeof payload === "object") {
    if (lang === "en" && payload.title_en) return payload.title_en;
    if (payload.title_ar) return payload.title_ar;
  }
  return template?.title ?? "نموذج تقييم";
}

export function getTemplateQuestionCount(template) {
  return parseTemplateQuestions(getTemplatePayload(template), "ar").length;
}

export function templateHasQuestions(template) {
  return getTemplateQuestionCount(template) > 0;
}

export function getTemplateDescription(template, lang = "ar") {
  const payload = getTemplatePayload(template);
  if (payload && typeof payload === "object") {
    if (lang === "en" && payload.description_en) return payload.description_en;
    if (payload.description_ar) return payload.description_ar;
  }
  return "";
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
        multiline: true,
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

export function buildEmptyAnswers(questions) {
  const answers = {};
  questions.forEach((question) => {
    if (isRatingQuestionType(question.type)) {
      answers[question.id] = question.min ?? 0;
    } else if (question.type === QUESTION_TYPES.TEXT) {
      answers[question.id] = "";
    } else if (question.type === QUESTION_TYPES.BOOLEAN) {
      answers[question.id] = null;
    } else if (question.type === QUESTION_TYPES.CHOICE) {
      answers[question.id] = "";
    } else if (question.type === QUESTION_TYPES.FILE) {
      answers[question.id] = null;
    }
  });
  return answers;
}

export function buildEmptyAnswersFromTemplate(template, lang = "ar") {
  return buildEmptyAnswers(resolveEvaluationQuestions(template, lang));
}

export function buildEmptyLegacyAnswers() {
  return {
    ...EMPTY_RATINGS,
    general_comments: "",
  };
}

function isEmptyAnswer(question, value) {
  if (isRatingQuestionType(question.type)) {
    const numeric = Number(value);
    const { min } = getRatingBounds(question);
    if (question.type === QUESTION_TYPES.RATING_1_5 || question.type === QUESTION_TYPES.RATING) {
      return !numeric || numeric < min;
    }
    return Number.isNaN(numeric) || numeric < min;
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

export async function readFileAnswer(file) {
  if (!file) return null;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl,
  };
}
