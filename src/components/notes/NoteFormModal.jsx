import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createWorkspaceNote,
  getWorkspaceNote,
  updateWorkspaceNote,
} from "../../services/quickNotesService.js";

export default function NoteFormModal({
  isOpen,
  noteId = null,
  onClose,
  onSaved,
}) {
  const isEditing = noteId != null;

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        if (isEditing) {
          const note = await getWorkspaceNote(noteId);
          if (cancelled || !note) return;
          setContent(note.content);
        } else {
          setContent("");
        }
      } catch (loadErr) {
        if (!cancelled) {
          setError(
            loadErr instanceof Error ? loadErr.message : "تعذّر تحميل الملاحظة.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditing, noteId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) {
      setError("يرجى كتابة نص الملاحظة.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const saved = isEditing
        ? await updateWorkspaceNote(noteId, { content: trimmedContent })
        : await createWorkspaceNote({ content: trimmedContent });

      onSaved?.(saved);
      onClose?.();
    } catch (submitErr) {
      setError(
        submitErr instanceof Error ? submitErr.message : "تعذّر حفظ الملاحظة.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formDisabled = isLoading || isSubmitting;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-form-heading"
    >
      <div className="relative w-full max-w-lg rounded-[16px] border border-[#E2E8F0] bg-white p-6 md:p-8 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 start-4 flex h-9 w-9 items-center justify-center rounded-md border border-[#E2E8F0] text-[#64748B] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2
          id="note-form-heading"
          className="mb-6 px-10 text-center text-lg font-medium text-[#0F172A] dark:text-[var(--text-primary)]"
        >
          {isEditing ? "تعديل الملاحظة" : "ملاحظة جديدة"}
        </h2>

        {isLoading ? (
          <p className="py-8 text-center text-sm font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
            جاري التحميل…
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="note-content"
                className="mb-2 block text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]"
              >
                نص الملاحظة <span className="text-red-600">*</span>
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                disabled={formDisabled}
                autoFocus
                className="w-full resize-none rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-normal leading-relaxed text-[#0F172A] outline-none placeholder:text-[#64748B] focus:border-[#0F172A] dark:border-[var(--border-color)] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]"
                placeholder="اكتب ملاحظتك…"
              />
            </div>

            {error ? (
              <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-800 dark:border-[var(--color-error-text)]/30 dark:bg-[var(--color-error-surface)] dark:text-[var(--color-error-text)]">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={formDisabled || !content.trim()}
                className="inline-flex items-center justify-center rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--accent-on-dark-bg)] dark:text-[var(--accent-color)]"
              >
                {isSubmitting ? "جاري الحفظ…" : "حفظ"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
