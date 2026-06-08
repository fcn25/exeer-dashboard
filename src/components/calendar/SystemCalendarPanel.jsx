import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import {
  DEFAULT_APPOINTMENT_TYPE,
  USER_APPOINTMENT_TYPES,
} from "../../constants/appointmentTypes.js";
import {
  CALENDAR_LEGEND_TYPES,
  createCalendarAppointment,
  deleteCalendarAppointment,
  fetchCalendarMonthData,
} from "../../services/calendarService.js";
import {
  buildMonthGrid,
  todayIsoDate,
} from "../../utils/calendarDates.js";

const WEEKDAY_HEADERS = ["سب", "أحد", "اثن", "ثل", "أرب", "خم", "جم"];

function TypeLegend({ t }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CALENDAR_LEGEND_TYPES).map(([type, meta]) => (
        <span
          key={type}
          className="inline-flex items-center gap-1.5 rounded-full border border-exeer-border px-2 py-0.5 text-[11px] font-medium text-exeer-primary dark:font-semibold"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
            aria-hidden
          />
          {t(meta.labelKey, { defaultValue: type })}
        </span>
      ))}
    </div>
  );
}

function DayCell({ date, isSelected, isToday, events, onSelect }) {
  const count = events.length;
  const types = [...new Set(events.map((e) => e.kind ?? e.type))].slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`relative flex min-h-[52px] flex-col items-center justify-start rounded-md border px-1 py-1.5 text-center transition-colors ${
        isSelected
          ? "border-slate-900 bg-slate-900 text-white dark:border-[var(--text-primary)] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]"
          : isToday
            ? "border-exeer-border bg-exeer-surface dark:border-slate-500 dark:bg-slate-800"
            : "border-transparent hover:border-exeer-border hover:bg-exeer-hover dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >
      <span
        className={`text-[13px] tabular-nums ${
          isSelected ? "font-bold" : isToday ? "font-semibold" : "font-medium"
        }`}
      >
        {Number(date.slice(8, 10))}
      </span>
      {count > 0 ? (
        <span className="mt-1 flex flex-wrap justify-center gap-0.5">
          {types.map((type) => (
            <span
              key={type}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CALENDAR_LEGEND_TYPES[type]?.color }}
              aria-hidden
            />
          ))}
        </span>
      ) : null}
      {count > 0 ? (
        <span className="sr-only">{count} موعد</span>
      ) : null}
    </button>
  );
}

export default function SystemCalendarPanel({ onClose, embedded = false }) {
  const { t, dir } = useAppLocale();
  const today = todayIsoDate();

  const initial = new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [eventsByDate, setEventsByDate] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    time: "",
    appointment_type: DEFAULT_APPOINTMENT_TYPE,
  });

  const monthLabel = useMemo(
    () =>
      formatLocaleDate(new Date(viewYear, viewMonth - 1, 1), {
        month: "long",
        year: "numeric",
      }),
    [viewYear, viewMonth],
  );

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedEvents = useMemo(
    () => eventsByDate.get(selectedDate) ?? [],
    [eventsByDate, selectedDate],
  );

  const loadMonth = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchCalendarMonthData(viewYear, viewMonth);
      setEventsByDate(data);
    } catch (err) {
      setError(err.message || t("calendar.loadError"));
      setEventsByDate(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [viewYear, viewMonth, t]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const goMonth = (delta) => {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  };

  const handleAddAppointment = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || !selectedDate) return;

    setIsSaving(true);
    setError("");
    try {
      await createCalendarAppointment({
        title,
        description: form.description,
        appointment_date: selectedDate,
        appointment_time: form.time || null,
        appointment_type: form.appointment_type,
      });
      setForm({
        title: "",
        description: "",
        time: "",
        appointment_type: DEFAULT_APPOINTMENT_TYPE,
      });
      await loadMonth();
    } catch (err) {
      setError(err.message || t("calendar.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!entry.deletable || !entry.sourceId) return;
    setDeletingId(entry.sourceId);
    setError("");
    try {
      await deleteCalendarAppointment(entry.sourceId);
      await loadMonth();
    } catch (err) {
      setError(err.message || t("calendar.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      dir={dir}
      className={`flex w-full flex-col bg-md-surface dark:bg-[var(--bg-surface)] ${
        embedded
          ? "max-w-none border-0"
          : "sticky top-0 max-w-[420px] shrink-0 self-stretch border-s border-exeer-border dark:border-[var(--border-color)]"
      }`}
      aria-label={t("calendar.title")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-exeer-border px-4 py-3 dark:border-[var(--border-color)]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-exeer-surface dark:bg-[var(--bg-surface-hover)]">
            <CalendarDays className="h-5 w-5 text-exeer-primary dark:text-[var(--text-primary)]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
              {t("calendar.title")}
            </h2>
            <p className="truncate text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
              {t("calendar.subtitle")}
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
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-exeer-border hover:bg-exeer-hover dark:border-slate-600"
            aria-label={t("calendar.prevMonth")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <p className="text-sm font-semibold text-exeer-primary">{monthLabel}</p>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-exeer-border hover:bg-exeer-hover dark:border-slate-600"
            aria-label={t("calendar.nextMonth")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <TypeLegend t={t} />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-exeer-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("common.loading")}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAY_HEADERS.map((label) => (
                <span
                  key={label}
                  className="py-1 text-center text-[11px] font-semibold text-exeer-muted"
                >
                  {label}
                </span>
              ))}
              {grid.map((date, index) =>
                date ? (
                  <DayCell
                    key={date}
                    date={date}
                    isSelected={date === selectedDate}
                    isToday={date === today}
                    events={eventsByDate.get(date) ?? []}
                    onSelect={setSelectedDate}
                  />
                ) : (
                  <span key={`empty-${index}`} className="min-h-[52px]" aria-hidden />
                ),
              )}
            </div>

            <section className="mt-5 space-y-3 rounded-md border border-exeer-border bg-exeer-surface p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <h3 className="text-sm font-semibold text-exeer-primary">
                {formatLocaleDate(selectedDate, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              {selectedEvents.length === 0 ? (
                <p className="text-xs text-exeer-muted">{t("calendar.noEventsDay")}</p>
              ) : (
                <ul className="space-y-2">
                  {selectedEvents.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-2 rounded-md border border-exeer-border bg-md-surface px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    >
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-exeer-primary">
                          {entry.title}
                        </p>
                        {entry.subtitle ? (
                          <p className="mt-0.5 text-xs text-exeer-muted">{entry.subtitle}</p>
                        ) : null}
                        {entry.time ? (
                          <p className="mt-0.5 text-[11px] text-exeer-muted">
                            {entry.time}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] font-medium text-exeer-muted">
                          {t(entry.typeLabelKey ?? `calendar.types.${entry.type}`, {
                            defaultValue: entry.kind ?? entry.type,
                          })}
                        </p>
                      </div>
                      {entry.deletable ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.sourceId}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form
              onSubmit={handleAddAppointment}
              className="mt-4 space-y-3 rounded-md border border-exeer-border bg-md-surface p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold text-exeer-primary">
                <Plus className="h-4 w-4" aria-hidden />
                {t("calendar.addAppointment")}
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-exeer-muted">
                  {t("calendar.appointmentTypeLabel")}
                </span>
                <select
                  value={form.appointment_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      appointment_type: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-exeer-border bg-md-surface px-3 py-2 text-sm text-exeer-primary outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-800"
                >
                  {Object.values(USER_APPOINTMENT_TYPES).map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t("calendar.appointmentTitle")}
                className="w-full rounded-md border border-exeer-border bg-md-surface px-3 py-2 text-sm text-exeer-primary outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-800"
                required
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={t("calendar.appointmentNotes")}
                rows={2}
                className="w-full resize-none rounded-md border border-exeer-border bg-md-surface px-3 py-2 text-sm text-exeer-primary outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-800"
              />
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full rounded-md border border-exeer-border bg-md-surface px-3 py-2 text-sm text-exeer-primary outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-800"
              />
              <button
                type="submit"
                disabled={isSaving || !form.title.trim()}
                className="md-btn-primary w-full disabled:opacity-50"
              >
                {isSaving ? t("common.loading") : t("calendar.saveAppointment")}
              </button>
            </form>
          </>
        )}

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
