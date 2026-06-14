import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import {
  AGENT_DIGEST_CARD,
  AGENT_DIGEST_ITEM,
  AGENT_PILL_WARNING,
  AGENT_SECTION_TITLE,
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
    title: "انضمام حديث",
    icon: UserPlus,
    chipClass:
      "bg-[#ECFDF5] text-[#047857] dark:bg-[var(--color-success-surface)] dark:text-[var(--color-success-text)]",
  },
  {
    key: "renewals",
    title: "تجديدات حديثة",
    icon: RefreshCw,
    chipClass:
      "bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[var(--color-info-surface)] dark:text-[var(--color-info-text)]",
  },
  {
    key: "adminActions",
    title: "إجراءات إدارية",
    icon: AlertTriangle,
    chipClass:
      "bg-[#F1F5F9] text-[#475569] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-secondary)]",
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
      {item.needs_approval ? (
        <span className={`mt-2 ${AGENT_PILL_WARNING}`}>يحتاج موافقتك</span>
      ) : null}
    </li>
  );
}

export default function QueryDigestGrid({ digest, loading, error }) {
  if (loading) {
    return <p className={AGENT_TEXT_MUTED}>جاري تحميل النظرة السريعة…</p>;
  }

  if (error) {
    return (
      <p className="text-sm font-normal text-red-700 dark:text-[var(--color-error-text)]">
        {error}
      </p>
    );
  }

  return (
    <section>
      <h2 className={`mb-4 ${AGENT_SECTION_TITLE}`}>نظرة سريعة على بياناتك</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {DIGEST_CARDS.map((card) => {
          const Icon = card.icon;
          const items = digest?.[card.key] ?? [];

          return (
            <article key={card.key} className={AGENT_DIGEST_CARD}>
              <div className="mb-4 flex items-center gap-3 border-b border-[#E2E8F0] pb-4 dark:border-[rgba(255,255,255,0.06)]">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${card.chipClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className={`${AGENT_SECTION_TITLE} text-[15px]`}>{card.title}</h3>
              </div>

              {items.length === 0 ? (
                <p className={AGENT_TEXT_MUTED}>لا توجد عناصر حديثة.</p>
              ) : (
                <ul>
                  {items.slice(0, 4).map((item) => (
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
