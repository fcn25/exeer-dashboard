import { CheckCircle2, ClipboardList } from "lucide-react";
import {
  getTemplateQuestionCount,
  templateHasQuestions,
} from "../../utils/evaluationTemplateQuestions.js";

export default function TemplatePickerGrid({
  templates,
  selectedId,
  onSelect,
  disabled = false,
  emptyMessage = "لا توجد نماذج جاهزة.",
}) {
  if (!templates.length) {
    return (
      <p className="rounded-2xl border border-exeer-border bg-exeer-surface px-4 py-8 text-center text-sm text-exeer-muted">
        {emptyMessage}
      </p>
    );
  }

  const sorted = [...templates].sort((a, b) => {
    const aReady = templateHasQuestions(a) ? 0 : 1;
    const bReady = templateHasQuestions(b) ? 0 : 1;
    if (aReady !== bReady) return aReady - bReady;
    return String(a.title).localeCompare(String(b.title), "ar");
  });

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      role="listbox"
      aria-label="اختيار نموذج التقييم"
    >
      {sorted.map((template) => {
        const isSelected = String(selectedId) === String(template.id);
        const questionCount = getTemplateQuestionCount(template);
        const isReady = questionCount > 0;

        return (
          <button
            key={template.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={disabled}
            onClick={() => onSelect(String(template.id))}
            className={`flex flex-col gap-2 rounded-xl border p-3 text-right transition-colors ${
              isSelected
                ? "border-md-primary bg-md-primary-container/30 ring-1 ring-md-primary dark:bg-[#1e3a5f]/30 dark:ring-[#2563eb]"
                : "border-exeer-border bg-md-surface hover:border-md-primary/35 hover:bg-exeer-hover"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-md-primary text-white dark:bg-[#2563eb]"
                    : "bg-exeer-surface text-exeer-primary"
                }`}
              >
                <ClipboardList className="h-4 w-4 stroke-[1.75]" aria-hidden />
              </span>
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-md-primary" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="line-clamp-2 text-sm font-semibold text-exeer-primary">
                {template.title}
              </p>
              <p className="truncate text-[11px] text-exeer-muted">{template.category}</p>
            </div>
            <p className="text-[11px] font-medium text-exeer-muted">
              {isReady
                ? `${questionCount} ${questionCount === 1 ? "سؤال جاهز" : "أسئلة جاهزة"}`
                : "بدون أسئلة مُعرّفة بعد"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
