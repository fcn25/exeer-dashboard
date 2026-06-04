import {
  getTemplatePreviewSections,
} from "../constants/performanceTemplates.js";
import { flattenTemplateQuestionRecords } from "./evaluationTemplateFlatten.js";
import {
  getQuestionRatingHintAr,
  mapQuestionToPreviewDetail,
} from "./evaluationTemplateQuestionHelpers.js";
import { QUESTION_TYPES } from "./evaluationTemplateTypes.js";

export { TEMPLATE_STRUCTURE_VERSION } from "./evaluationTemplateTypes.js";

function normalizeStoredQuestion(question) {
  if (!question?.id || !question?.type) return null;

  return {
    ...question,
    text_ar:
      question.text_ar ??
      question.text ??
      question.textAr ??
      "",
    text_en: question.text_en ?? question.textEn ?? "",
  };
}

function storedQuestionToPreviewDetail(question, index) {
  if (question?.text) {
    return {
      id: String(question.id ?? `preview-q-${index}`),
      text: String(question.text).trim(),
      type: question.type,
      min: question.min,
      max: question.max,
      ratingHint: question.ratingHint ?? getQuestionRatingHintAr(question),
    };
  }
  return mapQuestionToPreviewDetail(question, index);
}

export function getCriterionRatingHint(questions = []) {
  if (!questions.length) return "";

  const hints = new Set(
    questions.map((q) => q.ratingHint ?? getQuestionRatingHintAr(q)).filter(Boolean),
  );

  if (hints.size === 1) return [...hints][0];

  const types = new Set(questions.map((q) => q.type).filter(Boolean));
  const allRating15 =
    types.size === 1 &&
    (types.has(QUESTION_TYPES.RATING_1_5) || types.has(QUESTION_TYPES.RATING));

  if (allRating15) return "طريقة التقييم: مقياس من 1 إلى 5";

  return "طريقة التقييم: حسب نوع كل سؤال أدناه";
}

function collectCriterionSlots(previewSections) {
  const slots = [];

  for (const section of previewSections ?? []) {
    const sectionTitle = String(section.title ?? "").trim();
    const items = section.criteria ?? section.questions ?? [];

    for (const item of items) {
      if (typeof item === "string") {
        slots.push({
          sectionTitle,
          criterionTitle: item.trim(),
          nestedQuestions: null,
        });
        continue;
      }

      if (item && typeof item === "object") {
        const nested = (item.questions ?? []).map((entry, index) => {
          if (entry && typeof entry === "object") {
            return storedQuestionToPreviewDetail(entry, index);
          }
          return {
            id: `${item.id ?? item.title}-q-${index}`,
            text: String(entry ?? "").trim(),
            type: QUESTION_TYPES.RATING_1_5,
            ratingHint: "طريقة التقييم: مقياس من 1 إلى 5",
          };
        });

        slots.push({
          sectionTitle,
          criterionTitle: String(item.title ?? "").trim(),
          nestedQuestions: nested.length ? nested : null,
        });
      }
    }
  }

  return slots;
}

function distributeQuestionsAcrossSlots(flatQuestions, slotCount) {
  if (!slotCount || !flatQuestions.length) return Array.from({ length: slotCount }, () => []);

  const chunks = Array.from({ length: slotCount }, () => []);
  flatQuestions.forEach((question, index) => {
    chunks[index % slotCount].push(question);
  });
  return chunks;
}

/**
 * Build v3 `categories[]` from Zoho flat questions + UI preview criterion titles.
 */
export function buildTemplateCategoriesPayload({
  previewSections = [],
  flatQuestions = [],
}) {
  const slots = collectCriterionSlots(previewSections);
  const flatDetails = flatQuestions.map((question, index) =>
    mapQuestionToPreviewDetail(question, index),
  );

  if (!slots.length) {
    if (!flatDetails.length) return [];
    return [
      {
        title_ar: "معايير التقييم",
        criteria: [
          {
            title_ar: "أسئلة التقييم",
            questions: flatQuestions.map(normalizeStoredQuestion).filter(Boolean),
          },
        ],
      },
    ];
  }

  const chunks = distributeQuestionsAcrossSlots(flatDetails, slots.length);
  const categoriesMap = new Map();

  slots.forEach((slot, slotIndex) => {
    if (!categoriesMap.has(slot.sectionTitle)) {
      categoriesMap.set(slot.sectionTitle, []);
    }

    let questionDetails = slot.nestedQuestions;

    if (!questionDetails?.length) {
      questionDetails = chunks[slotIndex] ?? [];
    }

    const storedQuestions = (questionDetails ?? [])
      .map((entry) =>
        entry?.text && !entry?.text_ar
          ? normalizeStoredQuestion({
              ...entry,
              text_ar: entry.text,
            })
          : normalizeStoredQuestion(entry),
      )
      .filter(Boolean);

    categoriesMap.get(slot.sectionTitle).push({
      title_ar: slot.criterionTitle,
      questions: storedQuestions,
    });
  });

  return Array.from(categoriesMap.entries()).map(([title_ar, criteria]) => ({
    title_ar,
    criteria,
  }));
}

function mapCategoriesToPreviewSections(categories) {
  return (categories ?? []).map((category, categoryIndex) => ({
    title: category.title_ar ?? category.title ?? "معايير التقييم",
    criteria: (category.criteria ?? []).map((criterion, criterionIndex) => {
      const questions = (criterion.questions ?? []).map((question, questionIndex) =>
        storedQuestionToPreviewDetail(question, questionIndex),
      );

      return {
        id: `cat-${categoryIndex}-crit-${criterionIndex}`,
        title: criterion.title_ar ?? criterion.title ?? "معيار",
        questions,
        ratingHint: getCriterionRatingHint(questions),
      };
    }),
  }));
}

/**
 * Preview sections for Template Preview Modal (categories → criteria → questions).
 */
export function buildTemplatePreviewSections({ questionsJsonb, uiTemplate }) {
  const source =
    questionsJsonb && typeof questionsJsonb === "object" ? questionsJsonb : {};

  if (Array.isArray(source.categories) && source.categories.length > 0) {
    return mapCategoriesToPreviewSections(source.categories);
  }

  if (Array.isArray(source.questions) && source.questions.length > 0) {
    const questions = source.questions.map((q, i) => storedQuestionToPreviewDetail(q, i));
    return [
      {
        title: "أسئلة التقييم",
        criteria: [
          {
            id: "default-criterion",
            title: "أسئلة التقييم",
            questions,
            ratingHint: getCriterionRatingHint(questions),
          },
        ],
      },
    ];
  }

  const flatRecords = flattenTemplateQuestionRecords(source);
  const uiPreviewSections = getTemplatePreviewSections(uiTemplate);

  if (flatRecords.length > 0) {
    console.log("buildTemplatePreviewSections flatRecords", flatRecords);
    const questions = flatRecords.map((question, index) =>
      storedQuestionToPreviewDetail(question, index),
    );

    return [
      {
        title: "أسئلة التقييم",
        criteria: [
          {
            id: "default-criterion",
            title: "أسئلة التقييم",
            questions,
            ratingHint: "",
          },
        ],
      },
    ];
  }

  if (uiPreviewSections.length > 0) {
    return mapCategoriesToPreviewSections(
      buildTemplateCategoriesPayload({
        previewSections: uiPreviewSections,
        flatQuestions: [],
      }),
    );
  }

  return [];
}

export function countTemplateQuestions(questionsJsonb) {
  return flattenTemplateQuestionRecords(questionsJsonb).filter(
    (item) => item?.id && item?.type,
  ).length;
}
