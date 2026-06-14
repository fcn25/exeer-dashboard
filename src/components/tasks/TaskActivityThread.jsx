import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRightLeft, Loader2, Paperclip, Send } from "lucide-react";
import {
  createTaskComment,
  getTaskAttachmentPublicUrl,
  listTaskActivity,
  subscribeTaskActivity,
  uploadTaskAttachment,
} from "../../services/taskActivityService.js";
import { prepareTaskAttachment, formatAttachmentSize } from "../../utils/taskAttachment.js";
import { listEmployeesForTasks } from "../../services/employeesService.js";
import { getEmployeeId } from "../../utils/mobileAuth.js";

function authorInitial(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "؟";
  return trimmed.charAt(0);
}

function formatRelativeTime(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
}

function StatusChangeItem({ item }) {
  const fromStatus = item.meta?.from ?? "—";
  const toStatus = item.meta?.to ?? "—";

  return (
    <div className="flex items-start gap-2 py-2 text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
      <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.75]" aria-hidden />
      <p>
        غُيّرت الحالة من <span className="font-medium">{fromStatus}</span> إلى{" "}
        <span className="font-medium">{toStatus}</span>
        {item.createdAt ? (
          <span className="mx-1 text-[#94A3B8]">· {formatRelativeTime(item.createdAt)}</span>
        ) : null}
      </p>
    </div>
  );
}

function CommentItem({ item }) {
  const attachmentHref = getTaskAttachmentPublicUrl(item.attachmentUrl);

  return (
    <article className="flex gap-3 rounded-[16px] border border-[#E2E8F0] bg-white p-3 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-medium text-[#475569] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-secondary)]"
        aria-hidden
      >
        {authorInitial(item.authorName)}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
            {item.authorName ?? "موظف"}
          </span>
          {item.createdAt ? (
            <span className="text-xs font-normal text-[#94A3B8] dark:text-[var(--text-secondary)]">
              {formatRelativeTime(item.createdAt)}
            </span>
          ) : null}
        </div>
        {item.body ? (
          <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed text-[#334155] dark:text-[var(--text-primary)]">
            {item.body}
          </p>
        ) : null}
        {attachmentHref ? (
          <a
            href={attachmentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-normal text-[#475569] underline underline-offset-2 dark:text-[var(--text-secondary)]"
          >
            <Paperclip className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
            عرض المرفق
          </a>
        ) : null}
      </div>
    </article>
  );
}

function MentionDropdown({ employees, query, onSelect }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = employees.filter((employee) =>
    employee.name.toLowerCase().includes(normalizedQuery),
  );

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full z-20 mb-1 w-full rounded-[12px] border border-[#E2E8F0] bg-white p-2 text-center text-xs text-[#64748B] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
        لا يوجد موظفون
      </div>
    );
  }

  return (
    <ul
      role="listbox"
      className="absolute bottom-full z-20 mb-1 max-h-40 w-full overflow-y-auto rounded-[12px] border border-[#E2E8F0] bg-white p-1 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
    >
      {filtered.slice(0, 8).map((employee) => (
        <li key={employee.id}>
          <button
            type="button"
            role="option"
            className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-start text-sm font-normal text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(employee);
            }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-medium dark:bg-[var(--bg-elevated)]">
              {authorInitial(employee.name)}
            </span>
            {employee.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function TaskActivityThread({ taskId }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isPreparingFile, setIsPreparingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const currentEmployeeId = getEmployeeId();

  const loadActivity = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    setError("");
    try {
      const rows = await listTaskActivity(taskId);
      setItems(rows);
    } catch (loadErr) {
      setItems([]);
      setError(loadErr instanceof Error ? loadErr.message : "تعذّر تحميل النشاط.");
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!taskId) return undefined;
    return subscribeTaskActivity(taskId, (row) => {
      setItems((prev) => {
        if (prev.some((item) => item.id === row.id)) return prev;
        return [...prev, row];
      });
    });
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    listEmployeesForTasks()
      .then((rows) => {
        if (cancelled) return;
        setEmployees(
          rows
            .map((row) => ({
              id: Number(row.id),
              name: String(row.name ?? row.full_name ?? "").trim(),
            }))
            .filter((row) => row.id && row.name),
        );
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mentionableEmployees = useMemo(
    () => employees.filter((employee) => employee.id !== currentEmployeeId),
    [employees, currentEmployeeId],
  );

  const handleBodyChange = (event) => {
    const value = event.target.value;
    setBody(value);

    const caret = event.target.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const atMatch = beforeCaret.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1] ?? "");
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const handleMentionSelect = (employee) => {
    const textarea = textareaRef.current;
    const value = body;
    const caret = textarea?.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const afterCaret = value.slice(caret);
    const atIndex = beforeCaret.lastIndexOf("@");
    if (atIndex < 0) return;

    const prefix = beforeCaret.slice(0, atIndex);
    const insertion = `@${employee.name} `;
    const nextValue = `${prefix}${insertion}${afterCaret}`;
    setBody(nextValue);
    setMentions((prev) =>
      prev.includes(employee.id) ? prev : [...prev, employee.id],
    );
    setShowMentions(false);
    setMentionQuery("");
    queueMicrotask(() => textarea?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !taskId) return;

    setIsSubmitting(true);
    setError("");

    try {
      let attachmentUrl = null;
      if (pendingFile) {
        attachmentUrl = await uploadTaskAttachment(pendingFile, taskId);
      }

      const created = await createTaskComment({
        taskId,
        body,
        attachmentUrl,
        mentions,
      });

      setItems((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        return [...prev, created];
      });
      setBody("");
      setMentions([]);
      setPendingFile(null);
      setShowMentions(false);
    } catch (submitErr) {
      setError(
        submitErr instanceof Error ? submitErr.message : "تعذّر إرسال التعليق.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-label="النشاط">
      <h3 className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
        النشاط
      </h3>

      {isLoading ? (
        <p className="py-6 text-center text-sm font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
          جاري تحميل النشاط…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-[#E2E8F0] px-4 py-6 text-center text-sm font-normal text-[#64748B] dark:border-[var(--border-color)] dark:text-[var(--text-secondary)]">
          لا يوجد نشاط بعد. ابدأ بإضافة تعليق.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) =>
            item.kind === "status_change" ? (
              <StatusChangeItem key={item.id} item={item} />
            ) : (
              <CommentItem key={item.id} item={item} />
            ),
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative space-y-2 border-t border-[#E2E8F0] pt-4 dark:border-[var(--border-color)]">
        {error ? (
          <p className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        {showMentions ? (
          <MentionDropdown
            employees={mentionableEmployees}
            query={mentionQuery}
            onSelect={handleMentionSelect}
          />
        ) : null}

        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          rows={3}
          placeholder="اكتب تعليقاً… استخدم @ لذكر موظف"
          className="w-full resize-none rounded-[16px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-normal text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#0F172A] dark:border-[var(--border-color)] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]"
        />

        {pendingFile ? (
          <p className="flex items-center gap-2 text-xs font-normal text-[#64748B] dark:text-[var(--text-secondary)]">
            <Paperclip className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
            {pendingFile.name}
            <span>({formatAttachmentSize(pendingFile.size)})</span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-[#0F172A] underline dark:text-[var(--text-primary)]"
            >
              إزالة
            </button>
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[12px] border border-[#E2E8F0] px-3 py-2 text-xs font-normal text-[#475569] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]">
              <Paperclip className="h-4 w-4 stroke-[1.75]" aria-hidden />
              {isPreparingFile ? "جاري تجهيز الملف…" : "مرفق"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="sr-only"
                disabled={isPreparingFile}
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  if (!file) return;

                  setIsPreparingFile(true);
                  setError("");
                  try {
                    const prepared = await prepareTaskAttachment(file);
                    setPendingFile(prepared);
                  } catch (fileErr) {
                    setPendingFile(null);
                    setError(
                      fileErr instanceof Error
                        ? fileErr.message
                        : "تعذّر تجهيز المرفق.",
                    );
                  } finally {
                    setIsPreparingFile(false);
                  }
                }}
              />
            </label>
            <span className="text-[11px] font-normal text-[#94A3B8] dark:text-[var(--text-secondary)]">
              صور أو PDF — بحد أقصى 1MB
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!body.trim() && !pendingFile)}
            className="inline-flex items-center gap-2 rounded-[12px] bg-[#0F172A] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-[var(--text-primary)] dark:text-[var(--bg-surface)]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin stroke-[1.75]" aria-hidden />
            ) : (
              <Send className="h-4 w-4 stroke-[1.75]" aria-hidden />
            )}
            إرسال
          </button>
        </div>
      </form>
    </section>
  );
}
