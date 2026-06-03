import { useCallback, useEffect, useState } from "react";
import { Calendar, MapPin, Plus, X } from "lucide-react";
import { DateTimeInput } from "./components/ui/DateInput.jsx";
import { createEvent, listEvents } from "./services/eventsService.js";
import { canCreateEvents } from "./utils/rbac.js";
import ExeerEmptyState from "./components/brand/ExeerEmptyState.jsx";

function mapEventRow(row) {
  if (!row || typeof row !== "object") return null;

  const name = String(row.name ?? "").trim();
  if (!name) return null;

  return {
    id: String(row.id),
    name,
    description: String(row.description ?? "").trim() || "—",
    location: String(row.location ?? "").trim() || "—",
    datetime: row.event_datetime ?? row.datetime,
    datetimeLabel: formatEventDateTime(row.event_datetime),
  };
}

function formatEventDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function CreateEventModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setDescription("");
    setDatetime("");
    setLocation("");
    setError("");
    setIsSaving(false);
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !datetime || !location.trim()) {
      setError("يرجى تعبئة اسم الفعالية والتاريخ والموقع.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onCreated({
        name: name.trim(),
        description: description.trim(),
        datetime,
        location: location.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر حفظ الفعالية.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
    >
      <div className="md-surface relative w-full max-w-lg p-6 md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 start-4 flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2
          id="create-event-title"
          className="mb-6 px-10 text-center text-xl font-bold text-exeer-primary"
        >
          إنشاء فعالية جديدة
        </h2>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="event-name" className="md-label mb-2 block">
              اسم الفعالية <span className="text-red-500">*</span>
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="md-input"
              placeholder="مثال: لقاء الموظفين"
            />
          </div>

          <div>
            <label htmlFor="event-description" className="md-label mb-2 block">
              الوصف
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
              className="md-input resize-none"
              placeholder="تفاصيل الفعالية..."
            />
          </div>

          <div>
            <label htmlFor="event-location" className="md-label mb-2 block">
              الموقع <span className="text-red-500">*</span>
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              className="md-input"
              placeholder="مثال: قاعة المؤتمرات"
            />
          </div>

          <DateTimeInput
            id="event-datetime"
            label="تاريخ ووقت الفعالية"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            disabled={isSaving}
            required
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || !name.trim() || !datetime || !location.trim()}
            className="md-btn-primary w-full"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ الفعالية"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const rows = await listEvents();
      setEvents(rows.map(mapEventRow).filter(Boolean));
    } catch (err) {
      setError(err.message || "تعذّر جلب الفعاليات.");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleCreateEvent = async (payload) => {
    await createEvent(payload);
    await loadEvents();
    setSuccessMessage("تم إنشاء الفعالية بنجاح");
  };

  return (
    <div className="md-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="md-page-title">الفعاليات</h1>
          <p className="text-sm text-exeer-muted">
            إدارة فعاليات المنشأة وجدولها الزمني
          </p>
        </div>
        {canCreateEvents() ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="md-btn-primary inline-flex items-center justify-center gap-2 self-start"
          >
            <Plus className="h-5 w-5" aria-hidden />
            إنشاء فعالية جديدة
          </button>
        ) : null}
      </header>

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="md-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-exeer-border bg-exeer-surface">
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  اسم الفعالية
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  التاريخ والوقت
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  الموقع
                </th>
                <th className="px-5 py-4 text-start font-semibold text-exeer-primary">
                  الوصف
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-16 text-center text-exeer-muted"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <ExeerEmptyState message="لا توجد فعاليات مسجلة" />
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-exeer-border transition-colors last:border-b-0 hover:bg-exeer-surface/60"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-exeer-primary">
                        {event.name}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-exeer-muted">
                        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{event.datetimeLabel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-exeer-muted">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{event.location}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-exeer-muted">
                      <p className="line-clamp-2">{event.description}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreateEvent}
      />
    </div>
  );
}
