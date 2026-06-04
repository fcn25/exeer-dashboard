import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { QUESTION_TYPES } from "../../utils/evaluationTemplateQuestions.js";

function DisabledStarRow({ min = 1, max = 5 }) {
  const count = Math.max(1, max - min + 1);
  return (
    <div
      className="flex flex-row-reverse items-center justify-end gap-0.5"
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <Star
          key={index}
          className="h-5 w-5 fill-gray-100 text-gray-200"
        />
      ))}
    </div>
  );
}

function RatingScalePreview({ criterion }) {
  if (
    criterion.type === QUESTION_TYPES.RATING_1_5 ||
    criterion.type === QUESTION_TYPES.RATING
  ) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">{criterion.ratingHint}</p>
        <DisabledStarRow min={criterion.min} max={criterion.max} />
      </div>
    );
  }

  if (
    criterion.type === QUESTION_TYPES.RATING_0_10 ||
    criterion.type === QUESTION_TYPES.RATING_0_100
  ) {
    const max = criterion.max ?? (criterion.type === QUESTION_TYPES.RATING_0_10 ? 10 : 100);
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">{criterion.ratingHint}</p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-2/3 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] tabular-nums text-slate-400">0–{max}</span>
        </div>
      </div>
    );
  }

  return <p className="text-xs text-slate-500">{criterion.ratingHint}</p>;
}

function CriterionAccordionItem({ criterion, isOpen, onToggle }) {
  const panelId = `criterion-panel-${criterion.id}`;
  const buttonId = `criterion-trigger-${criterion.id}`;

  return (
    <div className="overflow-hidden rounded-md border border-gray-100 bg-white">
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-right transition-colors hover:bg-gray-50/80"
      >
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
          {criterion.title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-gray-100 bg-white px-3 py-3">
            <p className="text-sm leading-relaxed text-slate-600">
              {criterion.questionText}
            </p>
            <RatingScalePreview criterion={criterion} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatePreviewCriterionAccordion({ criteria }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {criteria.map((criterion) => (
        <CriterionAccordionItem
          key={criterion.id}
          criterion={criterion}
          isOpen={openIds.has(criterion.id)}
          onToggle={() => toggle(criterion.id)}
        />
      ))}
    </div>
  );
}
