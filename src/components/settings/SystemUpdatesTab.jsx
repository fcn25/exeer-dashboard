import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { fetchSystemUpdates } from "../../services/systemUpdatesService.js";

function UpdateTimelineItem({ item, isFirst }) {
  const { t } = useTranslation();

  return (
    <li className="relative me-4 border-s-2 border-exeer-border ps-5 pb-6 last:pb-0">
      <span
        className={`absolute -start-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ${
          isFirst
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-exeer-surface text-exeer-muted"
        }`}
      >
        <History className="h-2.5 w-2.5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
        <p className="text-xs text-exeer-muted">
          {item.publishedAt
            ? formatLocaleDate(item.publishedAt, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : t("settings.updates.unknownDate")}
        </p>
      </div>
    </li>
  );
}

export default function SystemUpdatesTab() {
  const { t } = useTranslation();
  const [updates, setUpdates] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUpdates() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await fetchSystemUpdates();
        if (cancelled) return;
        setUpdates(payload.updates);
        setGeneratedAt(payload.generatedAt);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t("settings.updates.loadError"));
          setUpdates([]);
          setGeneratedAt(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUpdates();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-exeer-primary">
          {t("settings.updates.title")}
        </h2>
        {generatedAt ? (
          <p className="text-xs text-exeer-muted">
            {t("settings.updates.lastSynced")}{" "}
            {formatLocaleDate(generatedAt, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="md-surface-muted flex items-center justify-center gap-2 px-4 py-10 text-sm text-exeer-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {t("settings.updates.loading")}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && updates.length === 0 ? (
        <div className="md-surface-muted rounded-md px-4 py-10 text-center text-sm text-exeer-muted">
          {t("settings.updates.empty")}
        </div>
      ) : null}

      {!isLoading && !error && updates.length > 0 ? (
        <ol className="md-surface px-5 py-5">
          {updates.map((item, index) => (
            <UpdateTimelineItem
              key={`${item.title}-${item.publishedAt ?? index}`}
              item={item}
              isFirst={index === 0}
            />
          ))}
        </ol>
      ) : null}
    </div>
  );
}
