import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import LocaleShell from "../../components/ui/LocaleShell.jsx";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { listMyTeamEmployees } from "../../services/myTeamService.js";
import {
  addTeamSkillAndTalent,
  listTeamSkillsAndTalents,
  listTrainingRequests,
  stripTrainingRequestMarker,
  submitTrainingRequest,
} from "../../services/trainingService.js";
import { REQUEST_STATUS_LABELS } from "../../services/myTeamService.js";

const TABS = [
  { id: "new", labelKey: "pages.mobile.training.tabs.new" },
  { id: "courses", labelKey: "pages.mobile.training.tabs.courses" },
  { id: "skills", labelKey: "pages.mobile.training.tabs.skills" },
];

export default function MobileTrainingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("new");
  const [team, setTeam] = useState([]);
  const [courses, setCourses] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [trainingDetails, setTrainingDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [skillEmployeeId, setSkillEmployeeId] = useState("");
  const [skill, setSkill] = useState("");
  const [talent, setTalent] = useState("");
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [skillError, setSkillError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [teamRows, courseRows] = await Promise.all([
        listMyTeamEmployees(),
        listTrainingRequests(),
      ]);
      setTeam(teamRows);
      setCourses(courseRows);
      setSkills(listTeamSkillsAndTalents());
    } catch (err) {
      setLoadError(err.message || t("pages.mobile.training.loadError"));
      setTeam([]);
      setCourses([]);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrainingSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await submitTrainingRequest({
        employeeId: employeeId ? Number(employeeId) : undefined,
        details: trainingDetails,
      });
      setTrainingDetails("");
      setEmployeeId("");
      setSuccessToast(t("pages.mobile.training.submitSuccess"));
      const courseRows = await listTrainingRequests();
      setCourses(courseRows);
      setActiveTab("courses");
    } catch (err) {
      setSubmitError(err.message || t("pages.mobile.training.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillSubmit = async (event) => {
    event.preventDefault();
    if (isSavingSkill) return;

    const member = team.find(
      (row) => String(row.id) === String(skillEmployeeId),
    );

    setIsSavingSkill(true);
    setSkillError("");

    try {
      addTeamSkillAndTalent({
        employeeId: skillEmployeeId,
        employeeName: member?.full_name,
        skill,
        talent,
      });
      setSkill("");
      setTalent("");
      setSkills(listTeamSkillsAndTalents());
      setSuccessToast(t("pages.mobile.training.skillSuccess"));
    } catch (err) {
      setSkillError(err.message || t("pages.mobile.training.skillError"));
    } finally {
      setIsSavingSkill(false);
    }
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
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
              <h1 className="truncate text-lg font-bold">
                {t("pages.mobile.training.title")}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">
              {t("pages.mobile.training.subtitle")}
            </p>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 pb-3"
          aria-label={t("pages.mobile.training.tabsLabel")}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[40px] shrink-0 rounded-md px-3 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white dark:bg-[var(--text-primary)] dark:text-[var(--bg-main)]"
                  : "border border-gray-200 bg-white text-slate-700 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)]"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-4 px-4 py-5 pb-8">
        {loadError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-exeer-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t("common.loading")}
          </div>
        ) : null}

        {!isLoading && activeTab === "new" ? (
          <form onSubmit={handleTrainingSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="training-employee" className="md-label block">
                {t("pages.mobile.training.employeeLabel")}
              </label>
              <select
                id="training-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isSubmitting}
                className="md-input"
              >
                <option value="">{t("pages.mobile.training.employeeOptional")}</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="training-details" className="md-label block">
                {t("pages.mobile.training.detailsLabel")}
              </label>
              <textarea
                id="training-details"
                value={trainingDetails}
                onChange={(e) => setTrainingDetails(e.target.value)}
                rows={5}
                required
                disabled={isSubmitting}
                placeholder={t("pages.mobile.training.detailsPlaceholder")}
                className="md-input min-h-[120px] resize-y"
              />
            </div>

            {submitError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="md-btn-primary w-full"
            >
              {isSubmitting
                ? t("pages.mobile.training.sending")
                : t("pages.mobile.training.submit")}
            </button>
          </form>
        ) : null}

        {!isLoading && activeTab === "courses" ? (
          <section className="space-y-3">
            {courses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-exeer-border px-4 py-10 text-center text-sm text-exeer-muted dark:border-[var(--border-color)]">
                {t("pages.mobile.training.coursesEmpty")}
              </p>
            ) : (
              <ul className="space-y-3">
                {courses.map((row) => {
                  const employeeName =
                    row.employees?.full_name ?? t("pages.mobile.training.unknownEmployee");
                  const statusLabel =
                    REQUEST_STATUS_LABELS[row.status] ?? row.status ?? "—";

                  return (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-exeer-border bg-md-surface p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
                          {employeeName}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-secondary)]">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]">
                        {formatLocaleDate(row.created_at, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
                        {stripTrainingRequestMarker(row.details)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {!isLoading && activeTab === "skills" ? (
          <div className="space-y-5">
            <form onSubmit={handleSkillSubmit} className="space-y-4 rounded-2xl border border-exeer-border bg-md-surface-dim p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
              <h2 className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
                {t("pages.mobile.training.addSkillTitle")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="skill-employee" className="md-label block">
                  {t("pages.mobile.training.employeeLabel")}
                </label>
                <select
                  id="skill-employee"
                  value={skillEmployeeId}
                  onChange={(e) => setSkillEmployeeId(e.target.value)}
                  required
                  disabled={isSavingSkill}
                  className="md-input"
                >
                  <option value="">{t("pages.mobile.promotion.selectEmployee")}</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="skill-name" className="md-label block">
                  {t("pages.mobile.training.skillLabel")}
                </label>
                <input
                  id="skill-name"
                  type="text"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  disabled={isSavingSkill}
                  placeholder={t("pages.mobile.training.skillPlaceholder")}
                  className="md-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="skill-talent" className="md-label block">
                  {t("pages.mobile.training.talentLabel")}
                </label>
                <textarea
                  id="skill-talent"
                  value={talent}
                  onChange={(e) => setTalent(e.target.value)}
                  rows={3}
                  disabled={isSavingSkill}
                  placeholder={t("pages.mobile.training.talentPlaceholder")}
                  className="md-input resize-y"
                />
              </div>

              {skillError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {skillError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSavingSkill}
                className="md-btn-primary w-full"
              >
                {isSavingSkill
                  ? t("common.loading")
                  : t("pages.mobile.training.saveSkill")}
              </button>
            </form>

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
                {t("pages.mobile.training.skillsListTitle")}
              </h2>
              {skills.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-exeer-border px-4 py-8 text-center text-sm text-exeer-muted dark:border-[var(--border-color)]">
                  {t("pages.mobile.training.skillsEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {skills.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-exeer-border bg-md-surface p-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
                    >
                      <p className="text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
                        {entry.employeeName}
                      </p>
                      {entry.skill ? (
                        <p className="mt-1 text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
                          <span className="font-medium">
                            {t("pages.mobile.training.skillLabel")}:
                          </span>{" "}
                          {entry.skill}
                        </p>
                      ) : null}
                      {entry.talent ? (
                        <p className="mt-1 text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
                          <span className="font-medium">
                            {t("pages.mobile.training.talentLabel")}:
                          </span>{" "}
                          {entry.talent}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </LocaleShell>
  );
}
