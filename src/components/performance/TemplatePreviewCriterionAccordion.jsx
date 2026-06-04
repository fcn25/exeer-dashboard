import { useState } from "react";
import { ChevronDown } from "lucide-react";

function ExpandedQuestionsList({ questions }) {
  if (!questions?.length) {
    return (
      <p className="text-sm text-gray-500">لا توجد أسئلة تفصيلية لهذا المعيار.</p>
    );
  }

  return (
    <ul className="space-y-2 rounded-md bg-gray-50/80 px-3 py-2.5">
      {questions.map((question, index) => (
        <li
          key={question.id ?? `question-${index}`}
          className="flex items-start gap-2 text-sm leading-relaxed text-gray-600"
        >
          <span className="mt-0.5 shrink-0 text-gray-400" aria-hidden>
            -
          </span>
          <div className="min-w-0 space-y-1">
            <span>{question.text}</span>
            {question.ratingHint ? (
              <p className="text-[11px] text-gray-400">{question.ratingHint}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CriterionAccordionItem({ criterion, isOpen, onToggle }) {
  const panelId = `criterion-panel-${criterion.id}`;
  const buttonId = `criterion-trigger-${criterion.id}`;
  const questions = criterion.questions ?? [];

  return (
    <div className="overflow-hidden rounded-md border border-gray-100 bg-white">
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-right transition-colors duration-150 hover:bg-gray-50/80"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
          {criterion.title}
        </span>
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
          <div className="border-t border-gray-100 bg-white px-3 py-3 ps-5">
            <ExpandedQuestionsList questions={questions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatePreviewCriterionAccordion({ criteria = [] }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!criteria.length) {
    return (
      <p className="px-2 py-3 text-center text-sm text-gray-500">
        لا توجد معايير للعرض.
      </p>
    );
  }

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
