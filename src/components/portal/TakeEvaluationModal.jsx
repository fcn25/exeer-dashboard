import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import EmployeeEvaluationForm from "../evaluation/EmployeeEvaluationForm.jsx";
import SuccessToast from "../ui/SuccessToast.jsx";
import { submitEmployeeEvaluation } from "../../services/performanceService.js";
import {
  buildEmptyAnswersFromTemplate,
  buildEmptyLegacyAnswers,
  getTemplateDisplayTitle,
  readFileAnswer,
  resolveEvaluationQuestions,
  QUESTION_TYPES,
} from "../../utils/evaluationTemplateQuestions.js";

async function prepareAnswersForSubmit(questions, rawAnswers) {
  const prepared = { ...rawAnswers };
  for (const question of questions) {
    if (question.type !== QUESTION_TYPES.FILE) continue;
    const file = rawAnswers?.[question.id];
    if (file instanceof File) {
      prepared[question.id] = await readFileAnswer(file);
    }
  }
  return prepared;
}

export default function TakeEvaluationModal({
  evaluation,
  isOpen,
  onClose,
  onSuccess,
}) {
  const template = evaluation?.evaluation_templates ?? null;
  const questions = useMemo(
    () => resolveEvaluationQuestions(template),
    [template],
  );

  const [answers, setAnswers] = useState(() => buildEmptyAnswersFromTemplate(template));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setAnswers(
      template?.questions_jsonb
        ? buildEmptyAnswersFromTemplate(template)
        : buildEmptyLegacyAnswers(),
    );
    setError("");
    setSuccessToast("");
    setIsSaving(false);
  }, [isOpen, evaluation?.id, template]);

  const handleSubmit = async () => {
    if (!evaluation?.id || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const prepared = await prepareAnswersForSubmit(questions, answers);
      await submitEmployeeEvaluation(evaluation.id, prepared, template);
      setSuccessToast("تم إرسال التقييم بنجاح.");
      onSuccess?.();
      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError(err.message || "تعذّر إرسال التقييم.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !evaluation) return null;

  const templateTitle = getTemplateDisplayTitle(template);
  const cycleName =
    evaluation.evaluation_cycles?.name ?? evaluation.cycleName ?? "—";

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="take-evaluation-title"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="إغلاق"
          onClick={onClose}
        />

        <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-md bg-md-surface sm:max-w-xl sm:rounded-md">
          <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-5 py-3">
            <div className="min-w-0 space-y-0.5">
              <h2
                id="take-evaluation-title"
                className="sr-only"
              >
                إجراء التقييم
              </h2>
              <p className="truncate text-sm font-medium text-exeer-muted">
                {cycleName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-2">
            <EmployeeEvaluationForm
              template={template}
              values={answers}
              onChange={setAnswers}
              disabled={isSaving}
              showBranding
              showSubmit
              isSubmitting={isSaving}
              submitLabel="إرسال"
              subtitle={`${templateTitle} — ${questions.length} ${questions.length === 1 ? "سؤال" : "أسئلة"}`}
              onSubmit={handleSubmit}
            />

            {error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <SuccessToast message={successToast} onDismiss={() => setSuccessToast("")} />
    </>
  );
}
