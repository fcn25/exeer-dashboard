import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sendFeedback } from "../../services/feedbackService.js";

const FEEDBACK_CATEGORIES = [
  { id: "feature", value: "اقتراح ميزة" },
  { id: "issue", value: "مشكلة" },
  { id: "question", value: "استفسار" },
];

export default function FeedbackSettingsSection() {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState("feature");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");

  const categoryValue = useMemo(
    () =>
      FEEDBACK_CATEGORIES.find((item) => item.id === categoryId)?.value ??
      FEEDBACK_CATEGORIES[0].value,
    [categoryId],
  );

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length > 0 && status !== "sending";

  useEffect(() => {
    if (status !== "success" && status !== "error") return undefined;
    const timer = setTimeout(() => setStatus("idle"), 3500);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    try {
      await sendFeedback({ message: trimmedMessage, category: categoryValue });
      setMessage("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
    if (status === "error") setStatus("idle");
  };

  const submitLabel =
    status === "sending"
      ? t("settings.feedback.submitSending")
      : status === "success"
        ? t("settings.feedback.submitSuccess")
        : status === "error"
          ? t("settings.feedback.submitError")
          : t("settings.feedback.submit");

  return (
    <section
      className="w-full min-w-0 rounded-md border border-exeer-border bg-[#fafafa] p-4 md:p-6 dark:border-[var(--border-color)] dark:bg-slate-900/40"
      aria-labelledby="settings-feedback-heading"
    >
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
          <MessageSquarePlus className="h-5 w-5 stroke-[1.75]" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <h2
            id="settings-feedback-heading"
            className="text-lg font-bold text-exeer-primary dark:text-[var(--text-primary)]"
          >
            {t("settings.feedback.title")}
          </h2>
          <p className="text-sm leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
            {t("settings.feedback.description")}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <label htmlFor="feedback-category" className="md-label block">
            {t("settings.feedback.categoryLabel")}
          </label>
          <select
            id="feedback-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={status === "sending"}
            className="md-input"
          >
            {FEEDBACK_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`settings.feedback.categories.${item.id}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="feedback-message" className="md-label block">
            {t("settings.feedback.messageLabel")}
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={handleMessageChange}
            disabled={status === "sending"}
            rows={5}
            maxLength={4000}
            placeholder={t("settings.feedback.messagePlaceholder")}
            className="md-input min-h-[8rem] resize-y"
          />
          <p className="text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
            {t("settings.feedback.messageHint")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="md-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
