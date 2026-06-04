/** Shared evaluation-template constants — no imports (breaks circular deps). */

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

export const TEMPLATE_STRUCTURE_VERSION = 3;

export const TEMPLATE_CATEGORY_LABELS_AR = {
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

export const TEMPLATE_SELECT_ATTEMPTS = [
  "id, category, title, criteria",
  "id, category, title, questions",
  "id, category, title, content",
  "id, category, title, questions_jsonb",
  "id, category, title",
];

export const TEMPLATE_EMBED_SELECT_ATTEMPTS = [
  "id, title, criteria",
  "id, title, questions",
  "id, title, content",
  "id, title, questions_jsonb",
  "id, title",
];

export const RATING_QUESTION_TYPES = new Set([
  QUESTION_TYPES.RATING,
  QUESTION_TYPES.RATING_1_5,
  QUESTION_TYPES.RATING_0_10,
  QUESTION_TYPES.RATING_0_100,
]);
