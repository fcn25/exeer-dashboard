import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, MapPin, Plus } from "lucide-react";
import CreateEventModal from "./components/events/CreateEventModal.jsx";
import { createEvent, listEvents } from "./services/eventsService.js";
import { canCreateEvents } from "./utils/rbac.js";
import ExeerEmptyState from "./components/brand/ExeerEmptyState.jsx";
import { formatLocaleDate } from "./i18n/formatLocale.js";
import { useAppLocale } from "./i18n/useAppLocale.js";

function formatEventDateTime(value) {
  return formatLocaleDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

export default function EventsPage() {
  const { t } = useAppLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
          <h1 className="md-page-title">{t("pages.events.title")}</h1>
          <p className="text-sm text-exeer-muted">
            {t("pages.events.subtitle")}
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
