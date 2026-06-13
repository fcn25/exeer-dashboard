import { Check, Eye, History } from "lucide-react";
import { MOCK_COMMAND_HISTORY } from "./constants/mockData.js";

function StatusBadge({ status }) {
  if (status === "executed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#047857]">
        <Check className="h-3 w-3" aria-hidden />
        نُفّذ
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
      <Eye className="h-3 w-3" aria-hidden />
      عرض
    </span>
  );
}

export default function CommandHistory({ onSelectItem, className = "" }) {
  return (
    <aside
      className={`flex h-full min-h-0 flex-col border-s border-[#E2E8F0] bg-[#F8FAFC] ${className}`.trim()}
      aria-label="سجل الأوامر السابقة"
    >
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3">
        <History className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
        <h2 className="text-sm font-semibold text-[#0F172A]">سجل الأوامر السابقة</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {MOCK_COMMAND_HISTORY.map((group) => (
          <section key={group.dateLabel} className="mb-4 last:mb-0">
            <h3 className="mb-2 px-1 text-[11px] font-medium text-[#64748B]">
              {group.dateLabel}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("reopen thread", item.id);
                      onSelectItem?.(item.id);
                    }}
                    className="flex w-full items-start justify-between gap-2 rounded-xl border border-transparent bg-white px-3 py-2.5 text-start transition-colors hover:border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    <span className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-[#0F172A]">
                      {item.text}
                    </span>
                    <StatusBadge status={item.status} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
