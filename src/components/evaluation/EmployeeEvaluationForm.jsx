import { useTranslation } from "react-i18next";
import { Paperclip, Star } from "lucide-react";
import {
  QUESTION_TYPES,
  resolveEvaluationQuestions,
} from "../../utils/evaluationTemplateQuestions.js";
import ExeerLogo from "../brand/ExeerLogo.jsx";

function ExeerFormHeader({ subtitle }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-md border border-gray-200 bg-white px-4 py-5 text-center">
      <p
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-5xl font-black tracking-widest text-exeer-primary/[0.04]"
        aria-hidden
      >
        إكسير
      </p>
      <div className="relative space-y-2">
        <ExeerLogo className="mx-auto h-9 w-auto object-contain opacity-90" />
        {subtitle ? (
          <p className="pt-1 text-xs leading-relaxed text-exeer-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function StarRatingInput({ question, value, onChange, disabled }) {
  const min = Number(question.min ?? 1);
  const max = Number(question.max ?? 5);
  const stars = [];
  for (let rating = max; rating >= min; rating -= 1) {
    stars.push(rating);
  }

  return (
    <div
      className="flex flex-row-reverse items-center justify-end gap-0.5"
      role="radiogroup"
      aria-label={question.text}
    >
      {stars.map((rating) => {
        const selected = Number(value) === rating;
        return (
          <label
            key={rating}
            className={`rounded-md p-1.5 transition-colors ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-exeer-hover"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={rating}
              checked={selected}
              onChange={() => onChange(rating)}
              disabled={disabled}
              className="sr-only"
            />
            <Star
              className={`h-7 w-7 sm:h-6 sm:w-6 ${
                selected ? "fill-amber-400 text-amber-400" : "text-exeer-border"
              }`}
              aria-hidden
            />
            <span className="sr-only">{rating}</span>
          </label>
        );
      })}
    </div>
  );
}

function RatingSliderInput({ question, value, onChange, disabled }) {
  const min = Number(question.min ?? 0);
  const max = Number(question.max ?? 100);
  const current = Number(value ?? min);

  return (
    <div className="space-y-3">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="md-slider w-full"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-label={question.text}
      />
      <div className="flex items-center justify-between text-xs text-exeer-muted">
        <span>{min}</span>
        <span className="rounded-full bg-md-primary-container px-3 py-1 text-sm font-bold text-md-on-primary-container dark:bg-[#1e3a5f] dark:text-[#e2e8f0]">
          {current}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function TextQuestionInput({ question, value, onChange, disabled }) {
  const inputId = `eval-q-${question.id}`;
  const commonProps = {
    id: inputId,
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    disabled,
    placeholder: "اكتب إجابتك…",
    className: "md-input w-full resize-y",
  };

  return question.multiline !== false ? (
    <textarea {...commonProps} rows={4} className={`${commonProps.className} min-h-[100px]`} />
  ) : (
    <input type="text" {...commonProps} />
  );
}

function BooleanQuestionInput({ question, value, onChange, disabled }) {
  const options = [
    { label: "نعم", val: true },
    { label: "لا", val: false },
  ];

  return (
    <div className="md-theme-segment w-full" role="radiogroup" aria-label={question.text}>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.val)}
          className={`md-theme-segment-btn flex-1 justify-center ${
            value === option.val ? "md-theme-segment-btn-active" : ""
          }`}
          aria-pressed={value === option.val}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChoiceQuestionInput({ question, value, onChange, disabled }) {
  const options = question.options ?? [];

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
              selected
                ? "border-md-primary bg-md-primary-container/25 dark:border-slate-600 dark:bg-[#1e3a5f]/25"
                : "border-exeer-border hover:bg-exeer-hover"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              checked={selected}
              onChange={() => onChange(option)}
              disabled={disabled}
              className="h-4 w-4 border-exeer-border text-md-primary focus:ring-0"
            />
            <span className="text-sm text-exeer-primary">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function FileQuestionInput({ question, value, onChange, disabled }) {
  const inputId = `eval-file-${question.id}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className={`md-surface-muted flex cursor-pointer items-center gap-3 rounded-md px-4 py-3 transition-colors ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:bg-exeer-hover"
        }`}
      >
        <Paperclip className="h-5 w-5 shrink-0 text-exeer-primary" aria-hidden />
        <span className="truncate text-sm text-exeer-muted">
          {value?.name ?? "اختر ملفاً للإرفاق"}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {value?.name ? (
        <p className="text-xs text-exeer-muted">تم اختيار: {value.name}</p>
      ) : null}
    </div>
  );
}

function QuestionField({ question, value, onChange, disabled, lang }) {
  const inputId = `eval-q-${question.id}`;

  return (
    <article className="md-surface-muted space-y-3 rounded-md px-4 py-4">
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-sm font-bold leading-snug text-exeer-primary">
          {question.text}
          {question.required ? (
            <span className="ms-1 text-red-600 dark:text-red-400" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {lang === "ar" && question.textEn ? (
          <p className="text-xs leading-relaxed text-exeer-muted">{question.textEn}</p>
        ) : null}
      </div>

      {question.type === QUESTION_TYPES.RATING_1_5 ||
      question.type === QUESTION_TYPES.RATING ? (
        <StarRatingInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}

      {question.type === QUESTION_TYPES.RATING_0_10 ||
      question.type === QUESTION_TYPES.RATING_0_100 ? (
        <RatingSliderInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}

      {question.type === QUESTION_TYPES.TEXT ? (
        <TextQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}

      {question.type === QUESTION_TYPES.BOOLEAN ? (
        <BooleanQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}

      {question.type === QUESTION_TYPES.CHOICE ? (
        <ChoiceQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}

      {question.type === QUESTION_TYPES.FILE ? (
        <FileQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
    </article>
  );
}

/**
 * Dynamic evaluation form driven by evaluation_templates.questions_jsonb.
 */
export default function EmployeeEvaluationForm({
  template,
  values,
  onChange,
  disabled = false,
  subtitle = "",
  showBranding = true,
  showSubmit = false,
  isSubmitting = false,
  submitLabel = "إرسال",
  onSubmit,
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "ar";
  const questions = resolveEvaluationQuestions(template, lang);

  const setAnswer = (questionId, nextValue) => {
    onChange({ ...values, [questionId]: nextValue });
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  const body = !questions.length ? (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      لا توجد أسئلة مُعرّفة لهذا النموذج.
    </p>
  ) : (
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={values?.[question.id]}
          onChange={(nextValue) => setAnswer(question.id, nextValue)}
          disabled={disabled || isSubmitting}
          lang={lang}
        />
      ))}
    </div>
  );

  const submitBlock = showSubmit ? (
    <div className="sticky bottom-0 border-t border-exeer-border bg-md-surface/95 px-1 pt-4 backdrop-blur-sm">
      <button
        type="submit"
        disabled={disabled || isSubmitting || !questions.length}
        className="md-btn-primary w-full py-3.5 text-base font-semibold"
      >
        {isSubmitting ? "جاري الإرسال..." : submitLabel}
      </button>
    </div>
  ) : null;

  if (showSubmit && onSubmit) {
    return (
      <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {showBranding ? <ExeerFormHeader subtitle={subtitle} /> : null}
          {body}
        </div>
        {submitBlock}
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {showBranding ? <ExeerFormHeader subtitle={subtitle} /> : null}
      {body}
    </div>
  );
}
