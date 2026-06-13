import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  UserPlus,
} from "lucide-react";

const DIGEST_CARDS = [
  {
    key: "requests",
    title: "آخر الطلبات",
    icon: ClipboardList,
    tone: "warning",
    chipBg: "#FEF3C7",
    chipColor: "#92400E",
  },
  {
    key: "joiners",
    title: "انضمام حديث",
    icon: UserPlus,
    tone: "success",
    chipBg: "#ECFDF5",
    chipColor: "#047857",
  },
  {
    key: "renewals",
    title: "تجديدات حديثة",
    icon: RefreshCw,
    tone: "info",
    chipBg: "#EFF6FF",
    chipColor: "#1D4ED8",
  },
  {
    key: "adminActions",
    title: "إجراءات إدارية",
    icon: AlertTriangle,
    tone: "neutral",
    chipBg: "#F1F5F9",
    chipColor: "#475569",
  },
];

function DigestItem({ item }) {
  return (
    <li className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
      <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
      {item.subtitle ? (
        <p className="mt-0.5 text-xs font-normal text-[#64748B]">{item.subtitle}</p>
      ) : null}
      {item.needs_approval ? (
        <span className="mt-1 inline-flex rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-medium text-[#92400E]">
          يحتاج موافقتك
        </span>
      ) : null}
    </li>
  );
}

export default function QueryDigestGrid({ digest, loading, error }) {
  if (loading) {
    return <p className="text-sm font-normal text-[#64748B]">جاري تحميل النظرة السريعة…</p>;
  }

  if (error) {
    return <p className="text-sm font-normal text-red-700">{error}</p>;
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-[#0F172A]">نظرة سريعة على بياناتك</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DIGEST_CARDS.map((card) => {
          const Icon = card.icon;
          const items = digest?.[card.key] ?? [];

          return (
            <article
              key={card.key}
              className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: card.chipBg, color: card.chipColor }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="text-sm font-medium text-[#0F172A]">{card.title}</h3>
              </div>

              {items.length === 0 ? (
                <p className="text-xs font-normal text-[#64748B]">لا توجد عناصر حديثة.</p>
              ) : (
                <ul className="space-y-2">
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
