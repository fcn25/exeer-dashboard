import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { listWorkspaceNotes } from "../../services/quickNotesService.js";

const HEADING_MAX = 50;

function noteHeading(content) {
  const normalized = String(content ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalized) return "ملاحظة فارغة";

  const firstLine = normalized.split("\n").find((line) => line.trim()) ?? normalized;
  const trimmed = firstLine.trim();
  if (trimmed.length <= HEADING_MAX) return trimmed;
  return `${trimmed.slice(0, HEADING_MAX).trim()}…`;
}

function notePreview(content) {
  const text = String(content ?? "").replace(/\r\n/g, "\n").trim();
  const firstLine = text.split("\n").find((line) => line.trim()) ?? "";
  const rest = text
    .slice(firstLine.length)
    .replace(/^\n+/, "")
    .trim();

  if (!rest) return "";
  if (rest.length <= 100) return rest;
  return `${rest.slice(0, 100).trim()}…`;
}

export default function NotesPanel({
  onClose,
  embedded = false,
  onOpenNoteForm,
  refreshKey = 0,
}) {
  const { t, dir } = useAppLocale();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await listWorkspaceNotes();
      setNotes(rows);
    } catch (loadErr) {
      setNotes([]);
      setError(
        loadErr instanceof Error ? loadErr.message : "تعذّر تحميل الملاحظات.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes, refreshKey]);

  return (
    <aside
      dir={dir}
      className={`flex w-full flex-col bg-md-surface dark:bg-[var(--bg-surface)] ${
        embedded
          ? "max-w-none border-0"
          : "sticky top-0 max-w-[420px] shrink-0 self-stretch border-s border-exeer-border dark:border-[var(--border-color)]"
      }`}
      aria-label={t("notes.panelTitle", { defaultValue: "الملاحظات" })}
    >
      <div className="flex items-center justify-between gap-3 border-b border-exeer-border px-4 py-3 dark:border-[var(--border-color)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-exeer-surface dark:bg-[var(--bg-surface-hover)]">
            <FileText
              className="h-5 w-5 text-exeer-primary dark:text-[var(--text-primary)]"
              aria-hidden
            />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-exeer-primary dark:text-[var(--text-primary)]">
              {t("notes.panelTitle", { defaultValue: "الملاحظات" })}
            </h2>
            <p className="truncate text-xs font-normal text-exeer-muted dark:text-[var(--text-secondary)]">
              {t("notes.panelSubtitle", { defaultValue: "سجل ملاحظات المنشأة" })}
            </p>
          </div>
        </div>
        {!embedded ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover dark:border-[var(--border-color)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <button
          type="button"
          onClick={() => onOpenNoteForm?.(null)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
        >
          <Plus className="h-4 w-4 stroke-[1.75]" aria-hidden />
          {t("notes.newNote", { defaultValue: "ملاحظة جديدة" })}
        </button>

        {isLoading ? (
          <p className="py-10 text-center text-sm font-normal text-exeer-muted dark:text-[var(--text-secondary)]">
            {t("common.loading")}
          </p>
        ) : error ? (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-800 dark:border-[var(--color-error-text)]/30 dark:bg-[var(--color-error-surface)] dark:text-[var(--color-error-text)]">
            {error}
          </p>
        ) : notes.length === 0 ? (
          <p className="py-10 text-center text-sm font-normal text-exeer-muted dark:text-[var(--text-secondary)]">
            {t("notes.empty", { defaultValue: "لا توجد ملاحظات بعد." })}
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const preview = notePreview(note.content);

              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => onOpenNoteForm?.(note.id)}
                    className="w-full rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3 text-start transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface-hover)]"
                  >
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
                      {noteHeading(note.content)}
                    </p>
                    {preview ? (
                      <p className="mt-1 line-clamp-2 text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
                        {preview}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
                      {formatLocaleDate(note.updatedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
