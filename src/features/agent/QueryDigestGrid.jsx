import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  ListTodo,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import {
  AGENT_DIGEST_CARD,
  AGENT_DIGEST_ITEM,
  AGENT_PILL,
  AGENT_PILL_WARNING,
  AGENT_TEXT_MUTED,
} from "./agentStyles.js";

const DIGEST_CARDS = [
  {
    key: "requests",
    title: "آخر الطلبات",
    icon: ClipboardList,
    chipClass:
      "bg-[#FEF3C7] text-[#92400E] dark:bg-[var(--color-warning-surface)] dark:text-[var(--color-warning-text)]",
  },
  {
    key: "joiners",
    title: "انضمام موظفين حديث",
    icon: UserPlus,
    chipClass:
      "bg-[#ECFDF5] text-[#047857] dark:bg-[var(--color-success-surface)] dark:text-[var(--color-success-text)]",
  },
  {
    key: "adminActions",
    title: "إجراءات إدارية حديثة",
    icon: AlertTriangle,
    chipClass:
      "bg-[#F1F5F9] text-[#475569] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-secondary)]",
  },
  {
    key: "renewals",
    title: "تجديدات وعقود قادمة",
    icon: RefreshCw,
    chipClass:
      "bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[var(--color-info-surface)] dark:text-[var(--color-info-text)]",
  },
  {
    key: "payrollRuns",
    title: "آخر عمليات مسير الرواتب",
    icon: Banknote,
    chipClass:
      "bg-[#F0FDF4] text-[#15803D] dark:bg-[var(--color-success-surface)] dark:text-[var(--color-success-text)]",
  },
  {
    key: "tasks",
    title: "خلاصة المهام",
    icon: ListTodo,
    chipClass:
      "bg-[#FFF7ED] text-[#C2410C] dark:bg-[var(--color-warning-surface)] dark:text-[var(--color-warning-text)]",
  },
];

function DigestItem({ item }) {
  return (
    <li className={AGENT_DIGEST_ITEM}>
      <p className="text-sm font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
        {item.title}
      </p>
      {item.subtitle ? (
        <p className={`mt-1 ${AGENT_TEXT_MUTED}`}>{item.subtitle}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.needs_approval ? (
          <span className={AGENT_PILL_WARNING}>يحتاج موافقتك</span>
        ) : null}
        {item.is_overdue ? (
          <span
            className={`${AGENT_PILL} bg-[#FEE2E2] text-[#B91C1C] dark:bg-[var(--color-error-surface)] dark:text-[var(--color-error-text)]`}
          >
            متأخرة
          </span>
        ) : null}
        {item.is_in_progress && !item.is_overdue ? (
          <span
            className={`${AGENT_PILL} bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[var(--color-info-surface)] dark:text-[var(--color-info-text)]`}
          >
            قيد التنفيذ
          </span>
        ) : null}
        {item.run_status === "locked" ? (
          <span
            className={`${AGENT_PILL} bg-[#F1F5F9] text-[#475569] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-secondary)]`}
          >
            مقفل
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default function QueryDigestGrid({ digest, loading, error }) {
  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  return (
    <section aria-label="تقرير حسابك">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {DIGEST_CARDS.map((card) => {
          const Icon = card.icon;
          const items = digest?.[card.key] ?? [];
          const count = items.length;

          return (
            <article key={card.key} className={AGENT_DIGEST_CARD}>
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4 dark:border-[rgba(255,255,255,0.06)]">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.chipClass}`}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <h3 className="text-[15px] font-semibold text-[#0F172A] dark:text-[var(--text-primary)]">
                    {card.title}
                  </h3>
                </div>
                <span
                  className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#475569] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-secondary)]"
                  aria-label={`${count} عناصر`}
                >
                  {count}
                </span>
              </div>

              {items.length === 0 ? (
                <p className={`py-2 ${AGENT_TEXT_MUTED}`}>لا توجد عناصر حديثة.</p>
              ) : (
                <ul>
                  {items.slice(0, 5).map((item) => (
                    <DigestItem key={`${card.key}-${item.id}`} item={item} />
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
