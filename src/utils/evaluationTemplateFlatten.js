/** Flatten v3 categories or legacy `questions[]` — leaf module (no service/seed imports). */

export function flattenTemplateQuestionRecords(questionsJsonb) {
  const source =
    questionsJsonb && typeof questionsJsonb === "object" ? questionsJsonb : {};

  if (Array.isArray(source.categories) && source.categories.length > 0) {
    const rows = [];
    for (const category of source.categories) {
      const categoryTitle = String(
        category.title_ar ?? category.title ?? "",
      ).trim();

      for (const criterion of category.criteria ?? []) {
        const criterionTitle = String(
          criterion.title_ar ?? criterion.title ?? "",
        ).trim();

        for (const question of criterion.questions ?? []) {
          if (!question?.id || !question?.type) continue;
          rows.push({
            ...question,
            category_ar: categoryTitle,
            section_ar: categoryTitle,
            criterion_ar: criterionTitle,
          });
        }
      }
    }
    return rows;
  }

  return Array.isArray(source.questions) ? source.questions : [];
}
