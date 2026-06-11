import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { HOME_BTN, HOME_CARD, HOME_SHELL } from "./homeStyles.js";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleDate, formatLocaleNumber } from "../../i18n/formatLocale.js";
import ImportantAlertsList from "./ImportantAlertsList.jsx";

function DaysBadge({ daysLeft, severity, todayLabel, isEn }) {
  const isCritical = severity === "critical";
  const dayLabel =
    daysLeft === 0
      ? todayLabel
      : isEn
        ? `${formatLocaleNumber(daysLeft)}d`
        : `${formatLocaleNumber(daysLeft)} يوم`;
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{
        backgroundColor: isCritical ? "#FEE2E2" : "#F1F5F9",
        color: isCritical ? "#B91C1C" : "#475569",
      }}
    >
      {dayLabel}
    </span>
  );
}

function AlertList({ items, emptyLabel, onItemAction, actionLabel }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Check className="h-8 w-8 text-[#10B981]" aria-hidden />
        <p className="text-[13px] text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="max-h-[280px] space-y-2 overflow-y-auto">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-start">
              <p className="truncate text-[13px] font-medium text-[#0F172A]">
                {item.fullName}
              </p>
              <p className="truncate text-[12px] text-[#64748B]">{item.jobTitle}</p>
              {item.message ? (
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#475569]">
                  {item.message}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                {formatLocaleDate(item.endDate, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <DaysBadge
              daysLeft={item.daysLeft}
              severity={item.severity}
              todayLabel={item.todayLabel}
              isEn={item.isEn}
            />
          </div>
          {onItemAction ? (
            <button
              type="button"
              onClick={() => onItemAction(item)}
              className={`${HOME_BTN} mt-2 w-full rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-medium text-[#0F172A] hover:bg-white`}
            >
              {actionLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AlertColumn({ title, description, icon: Icon, iconTone, count, children }) {
  return (
    <article className={`${HOME_CARD} flex flex-col p-4`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: iconTone.bg, color: iconTone.color }}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 text-start">
            <h3 className="text-[14px] font-medium text-[#0F172A]">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748B]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {count > 0 ? (
          <span
            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
          >
            {formatLocaleNumber(count)}
          </span>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function EmergencyAlertsGrid({
  contracts,
  iqamas,
  workPermits,
  probations,
  mapItems,
  t,
  onViewEmployee,
  onProbationDecision,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <AlertColumn
        title={t("pages.home.contractExpiry")}
        description={t("pages.home.contractExpiryHint")}
        icon={FileWarning}
        iconTone={{ bg: "#FEE2E2", color: "#DC2626" }}
        count={contracts.length}
      >
        <AlertList
          items={mapItems(contracts)}
          emptyLabel={t("pages.home.contractEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.iqamaExpiry")}
        description={t("pages.home.iqamaExpiryHint")}
        icon={AlertTriangle}
        iconTone={{ bg: "#F1F5F9", color: "#64748B" }}
        count={iqamas.length}
      >
        <AlertList
          items={mapItems(iqamas)}
          emptyLabel={t("pages.home.iqamaEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.workPermitExpiry")}
        icon={AlertTriangle}
        iconTone={{ bg: "#F1F5F9", color: "#64748B" }}
        count={workPermits.length}
      >
        <AlertList
          items={mapItems(workPermits)}
          emptyLabel={t("pages.home.workPermitEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.probationEnding")}
        description={t("pages.home.probationEndingHint")}
        icon={CalendarClock}
        iconTone={{ bg: "#EEF2FF", color: "#4F46E5" }}
        count={probations.length}
      >
        <AlertList
          items={mapItems(probations)}
          emptyLabel={t("pages.home.probationEmpty")}
          onItemAction={(item) => onProbationDecision?.(item)}
          actionLabel={t("pages.home.probationDecision")}
        />
      </AlertColumn>
    </div>
  );
}

export default function EmergencyAlertsPanel({
  alerts,
  isLoading = false,
  onProbationDecision,
  onViewEmployee,
  showImportantTab = false,
}) {
  const { t, isEn } = useAppLocale();
  const [activeTab, setActiveTab] = useState("emergency");
  const {
    contracts = [],
    iqamas = [],
    probations = [],
    workPermits = [],
    totalCount = 0,
  } = alerts ?? {};
  const todayLabel = t("common.today");
  const mapItems = (items) =>
    items.map((item) => ({ ...item, todayLabel, isEn }));

  return (
    <section
      className={`${HOME_SHELL} overflow-hidden`}
      aria-labelledby="emergency-alerts-heading"
    >
      <div className="border-b border-[#F1F5F9] bg-[#FAFAF9] px-5 py-4 dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <div className="text-start">
              <h2
                id="emergency-alerts-heading"
                className="text-[18px] font-medium text-[#0F172A]"
              >
                {t("pages.home.emergencyTitle")}
              </h2>
              <p className="text-[12px] text-[#64748B]">
                {t("pages.home.emergencySubtitle")}
              </p>
            </div>
          </div>
          {!isLoading && totalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-[13px] font-medium text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {t("pages.home.emergencyCount", { count: formatLocaleNumber(totalCount) })}
            </span>
          ) : null}
        </div>

        {showImportantTab ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-4 dark:border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setActiveTab("emergency")}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                activeTab === "emergency"
                  ? "bg-[#0F172A] text-white dark:bg-[var(--accent-on-dark-bg)]"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
              }`}
            >
              {t("pages.home.emergencyTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("important")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                activeTab === "important"
                  ? "bg-[#0F172A] text-white dark:bg-[var(--accent-on-dark-bg)]"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
              }`}
            >
              {t("pages.home.importantAlertsTab")}
              {totalCount > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    activeTab === "important"
                      ? "bg-white/20 text-white"
                      : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}
                >
                  {formatLocaleNumber(totalCount)}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <p className="py-10 text-center text-[13px] text-[#94A3B8]">
            {t("pages.home.checkingAlerts")}
          </p>
        ) : showImportantTab && activeTab === "important" ? (
          <ImportantAlertsList
            alerts={alerts}
            onViewEmployee={onViewEmployee}
            onProbationDecision={onProbationDecision}
          />
        ) : (
          <EmergencyAlertsGrid
            contracts={contracts}
            iqamas={iqamas}
            workPermits={workPermits}
            probations={probations}
            mapItems={mapItems}
            t={t}
            onViewEmployee={onViewEmployee}
            onProbationDecision={onProbationDecision}
          />
        )}
      </div>
    </section>
  );
}
