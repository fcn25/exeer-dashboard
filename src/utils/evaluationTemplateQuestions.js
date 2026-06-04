import {
  EVALUATION_CRITERIA,
  EMPTY_RATINGS,
} from "../constants/evaluationCriteria.js";

export const QUESTION_TYPES = {
  RATING: "rating",
  RATING_1_5: "rating_1_5",
  RATING_0_10: "rating_0_10",
  RATING_0_100: "rating_0_100",
  TEXT: "text",
  BOOLEAN: "boolean",
  CHOICE: "choice",
  FILE: "file",
};

const RATING_TYPES = new Set([
  QUESTION_TYPES.RATING,
  QUESTION_TYPES.RATING_1_5,
  QUESTION_TYPES.RATING_0_10,
  QUESTION_TYPES.RATING_0_100,
]);

export function isRatingQuestionType(type) {
  return RATING_TYPES.has(type);
}

export function getQuestionLabel(question, lang = "ar") {
  if (lang === "en") {
    return question.text_en || question.textEn || question.text_ar || question.text || "";
  }
  return question.text_ar || question.text || question.text_en || question.textEn || "";
}

export function getChoiceOptions(question, lang = "ar") {
  if (lang === "en") {
    return question.options_en || question.optionsEn || question.options_ar || [];
  }
  return question.options_ar || question.optionsAr || question.options_en || [];
}

export function getRatingBounds(question) {
  switch (question.type) {
    case QUESTION_TYPES.RATING_0_10:
      return { min: 0, max: 10 };
    case QUESTION_TYPES.RATING_0_100:
      return { min: 0, max: 100 };
    case QUESTION_TYPES.RATING_1_5:
    case QUESTION_TYPES.RATING:
    default:
      return { min: Number(question.min ?? 1), max: Number(question.max ?? 5) };
  }
}

export function isQuestionRequired(question) {
  if (question.required != null) return Boolean(question.required);
  if (question.type === QUESTION_TYPES.TEXT) return false;
  if (question.type === QUESTION_TYPES.FILE) return true;
  return true;
}

export function normalizeQuestion(question, lang = "ar") {
  const bounds = getRatingBounds(question);
  return {
    ...question,
    text: getQuestionLabel(question, lang),
    textEn: question.text_en || question.textEn || "",
    min: bounds.min,
    max: bounds.max,
    required: isQuestionRequired(question),
    multiline: question.type === QUESTION_TYPES.TEXT ? question.multiline !== false : false,
    options: getChoiceOptions(question, lang),
  };
}

export function parseTemplateQuestions(questionsJsonb, lang = "ar") {
  const source =
    questionsJsonb && typeof questionsJsonb === "object" ? questionsJsonb : {};
  const list = Array.isArray(source.questions) ? source.questions : [];
  return list
    .filter((item) => item?.id && item?.type)
    .map((item) => normalizeQuestion(item, lang));
}

export function getTemplateDisplayTitle(template, lang = "ar") {
  const payload = template?.questions_jsonb;
  if (payload && typeof payload === "object") {
    if (lang === "en" && payload.title_en) return payload.title_en;
    if (payload.title_ar) return payload.title_ar;
  }
  return template?.title ?? "نموذج تقييم";
}

export function getTemplateQuestionCount(template) {
  return parseTemplateQuestions(template?.questions_jsonb).length;
}

export function templateHasQuestions(template) {
  return getTemplateQuestionCount(template) > 0;
}

const TEMPLATE_CATEGORY_LABELS_AR = {
  HR: "الموارد البشرية",
  General: "عام",
  Compliance: "الامتثال",
  Management: "الإدارة",
  Strategy: "الاستراتيجية",
  Culture: "الثقافة",
  Technology: "التقنية",
  Sales: "المبيعات",
  Finance: "المالية",
  Operations: "التشغيل",
};

export function getTemplateCategoryLabelAr(category) {
  const key = String(category ?? "").trim();
  return TEMPLATE_CATEGORY_LABELS_AR[key] ?? (key || "معايير التقييم");
}

export function getTemplateDescription(template, lang = "ar") {
  const payload = template?.questions_jsonb;
  if (payload && typeof payload === "object") {
    if (lang === "en" && payload.description_en) return payload.description_en;
    if (payload.description_ar) return payload.description_ar;
  }
  return "";
}

export function getQuestionRatingHintAr(question) {
  if (!question?.type) return "طريقة التقييم: نصي";

  switch (question.type) {
    case QUESTION_TYPES.RATING_1_5:
    case QUESTION_TYPES.RATING: {
      const bounds = getRatingBounds(question);
      return `طريقة التقييم: مقياس من ${bounds.min} إلى ${bounds.max}`;
    }
    case QUESTION_TYPES.RATING_0_10:
      return "طريقة التقييم: مقياس من 0 إلى 10";
    case QUESTION_TYPES.RATING_0_100:
      return "طريقة التقييم: مقياس من 0 إلى 100";
    case QUESTION_TYPES.TEXT:
      return "طريقة التقييم: إجابة نصية";
    case QUESTION_TYPES.BOOLEAN:
      return "طريقة التقييم: نعم / لا";
    case QUESTION_TYPES.CHOICE:
      return "طريقة التقييم: اختيار من قائمة";
    case QUESTION_TYPES.FILE:
      return "طريقة التقييم: مرفق";
    default:
      return "طريقة التقييم: حسب النموذج";
  }
}

export function mapQuestionToPreviewCriterion(question, index = 0) {
  const bounds = getRatingBounds(question);
  const questionText = getQuestionLabel(question, "ar");
  const criterionTitle =
    String(question.criterion_ar ?? question.criterionAr ?? "").trim() ||
    questionText;

  return {
    id: String(question.id ?? `preview-q-${index}`),
    title: criterionTitle,
    questionText,
    type: question.type,
    min: bounds.min,
    max: bounds.max,
    ratingHint: getQuestionRatingHintAr(question),
  };
}

export function buildStaticPreviewCriterion(text, id) {
  const label = String(text ?? "").trim();
  return {
    id,
    title: label,
    questionText: label,
    type: QUESTION_TYPES.RATING_1_5,
    min: 1,
    max: 5,
    ratingHint: "طريقة التقييم: مقياس من 1 إلى 5",
  };
}

/** Normalize legacy static sections (`questions: string[]`) to accordion criteria. */
export function normalizeStaticPreviewSections(sections, templateId = "template") {
  return (sections ?? []).map((section, sectionIndex) => ({
    title: section.title,
    criteria: (section.questions ?? section.criteria ?? []).map((item, itemIndex) => {
      if (item && typeof item === "object" && item.title) {
        return item;
      }
      return buildStaticPreviewCriterion(
        item,
        `${templateId}-${sectionIndex}-${itemIndex}`,
      );
    }),
  }));
}

/** Group DB questions into preview sections with expandable criterion payloads. */
export function groupQuestionsForPreview(questions, options = {}) {
  const {
    fallbackSection = "معايير التقييم",
    templateCategory = "",
  } = options;

  if (!questions?.length) return [];

  const groups = new Map();

  questions.forEach((question, index) => {
    const section =
      String(
        question.section_ar ??
          question.sectionAr ??
          question.category_ar ??
          question.categoryAr ??
          "",
      ).trim() ||
      getTemplateCategoryLabelAr(templateCategory) ||
      fallbackSection;

    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(mapQuestionToPreviewCriterion(question, index));
  });

  return Array.from(groups.entries()).map(([title, criteria]) => ({
    title,
    criteria,
  }));
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
  const parsed = parseTemplateQuestions(template?.questions_jsonb, lang);
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
