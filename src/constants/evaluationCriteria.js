export const EVALUATION_CRITERIA = [
  {
    key: "quality_of_work",
    label: "جودة العمل",
    labelEn: "Quality of Work",
  },
  {
    key: "communication",
    label: "التواصل",
    labelEn: "Communication",
  },
  {
    key: "punctuality",
    label: "الالتزام بالمواعيد",
    labelEn: "Punctuality",
  },
  {
    key: "teamwork",
    label: "العمل الجماعي",
    labelEn: "Teamwork",
  },
  {
    key: "initiative",
    label: "المبادرة",
    labelEn: "Initiative",
  },
];

export const EMPTY_RATINGS = Object.fromEntries(
  EVALUATION_CRITERIA.map((c) => [c.key, 0]),
);

export function calculateEvaluationScore(answers) {
  const ratings = EVALUATION_CRITERIA.map((c) => Number(answers?.[c.key] ?? 0)).filter(
    (value) => value >= 1 && value <= 5,
  );
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
