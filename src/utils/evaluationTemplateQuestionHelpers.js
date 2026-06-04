import {
  QUESTION_TYPES,
  RATING_QUESTION_TYPES,
  TEMPLATE_CATEGORY_LABELS_AR,
} from "./evaluationTemplateTypes.js";

export function isRatingQuestionType(type) {
  return RATING_QUESTION_TYPES.has(type);
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

export function getTemplateCategoryLabelAr(category) {
  const key = String(category ?? "").trim();
  return TEMPLATE_CATEGORY_LABELS_AR[key] ?? (key || "معايير التقييم");
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

export function mapQuestionToPreviewDetail(question, index = 0) {
  const bounds = getRatingBounds(question);
  const questionText = getQuestionLabel(question, "ar");

  return {
    id: String(question.id ?? `preview-detail-${index}`),
    text: questionText,
    type: question.type,
    min: bounds.min,
    max: bounds.max,
    ratingHint: getQuestionRatingHintAr(question),
  };
}
