import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Star, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import LogAchievementModal from "../../components/achievements/LogAchievementModal.jsx";
import { listEmployeeAchievementsWithEmployees } from "../../services/achievementsService.js";
import { listMyTeamEmployees } from "../../services/myTeamService.js";
import { getInitials } from "../../components/employees/employeeFormShared.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import LocaleShell from "../../components/ui/LocaleShell.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";

function mapAchievementRow(row) {
  const employee = row.employees ?? {};
  return {
    id: String(row.id),
    title: String(row.title ?? "").trim(),
    description: String(row.description ?? "").trim(),
    employeeName: String(employee.full_name ?? "—").trim() || "—",
    achievementDate: row.achievement_date,
  };
}

export default function MobileRecognitionPage() {
  const { t } = useTranslation();
  const [team, setTeam] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [teamRows, achievementRows] = await Promise.all([
        listMyTeamEmployees(),
        listEmployeeAchievementsWithEmployees(),
      ]);
      setTeam(teamRows);
      setAchievements(
        achievementRows.map(mapAchievementRow).filter((item) => item.title),
      );
    } catch (err) {
      setLoadError(err.message || t("pages.mobile.recognition.loadError"));
      setTeam([]);
      setAchievements([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAchievementFor = (member) => {
    setSelectedMember(member);
    setIsAchievementOpen(true);
  };

  return (
    <LocaleShell className="mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-white font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]/95">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 text-slate-600 dark:border-[var(--border-color)] dark:text-[var(--text-primary)]"
            aria-label={t("common.back")}
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">
              {t("pages.mobile.recognition.title")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
              {t("pages.mobile.recognition.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-4 py-5 pb-8">
        {loadError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {loadError}
          </p>
        ) : null}

        <section className="space-y-3" aria-labelledby="recognition-team-heading">
          <h2
            id="recognition-team-heading"
            className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
          >
            {t("pages.mobile.recognition.teamSection")}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-exeer-muted">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {t("common.loading")}
            </div>
          ) : team.length === 0 ? (
            <p className="rounded-2xl border border-exeer-border bg-md-surface px-4 py-8 text-center text-sm text-exeer-muted dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
              {t("pages.myTeam.noTeam")}
            </p>
          ) : (
            <ul className="space-y-2">
              {team.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-exeer-border bg-md-surface px-4 py-3 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      {getInitials(member.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
                        {member.full_name}
                      </p>
                      <p className="truncate text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
                        {member.job_title_name || "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAchievementFor(member)}
                    className="md-btn-primary inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs"
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden />
                    {t("pages.mobile.recognition.addAchievement")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="recognition-archive-heading">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" aria-hidden />
            <h2
              id="recognition-archive-heading"
              className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
            >
              {t("pages.mobile.recognition.archiveTitle")}
            </h2>
          </div>

          {isLoading ? null : achievements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-exeer-border px-4 py-8 text-center text-sm text-exeer-muted dark:border-[var(--border-color)]">
              {t("pages.mobile.recognition.archiveEmpty")}
            </p>
          ) : (
            <ol className="space-y-3">
              {achievements.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-exeer-border bg-md-surface-dim p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-exeer-muted dark:text-[var(--text-secondary)]">
                        {item.employeeName}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
                        {item.title}
                      </h3>
                    </div>
                    {item.achievementDate ? (
                      <time
                        dateTime={item.achievementDate}
                        className="shrink-0 text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]"
                      >
                        {formatLocaleDate(item.achievementDate, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <LogAchievementModal
        isOpen={isAchievementOpen}
        onClose={() => {
          setIsAchievementOpen(false);
          setSelectedMember(null);
        }}
        employeeId={selectedMember?.id}
        employeeName={selectedMember?.full_name}
        onSuccess={() => {
          setSuccessToast(t("pages.mobile.recognition.success"));
          loadData();
        }}
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </LocaleShell>
  );
}
