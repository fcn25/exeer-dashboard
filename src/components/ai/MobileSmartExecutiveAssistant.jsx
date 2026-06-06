import { useState } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { STRATEGIC_AI_TOOLS } from "../../services/strategicAiService.js";
import StrategicAiInsightModal from "./StrategicAiInsightModal.jsx";

export default function MobileSmartExecutiveAssistant() {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <>
      <section
        className="overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40 p-4 dark:border-violet-900/30 dark:from-violet-950/25 dark:via-slate-900 dark:to-indigo-950/15"
        aria-labelledby="mobile-smart-assistant-heading"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base" aria-hidden>
            ✨
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="mobile-smart-assistant-heading"
              className="text-sm font-semibold text-exeer-primary"
            >
              المساعد الإداري الذكي
            </h2>
            <p className="text-[11px] text-exeer-muted">
              تحليلات استراتيجية لصحة المنشأة والأداء
            </p>
          </div>
          <Sparkles
            className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400"
            aria-hidden
          />
        </div>

        <ul className="divide-y divide-violet-100/80 rounded-xl border border-white/70 bg-white/80 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900/50">
          {STRATEGIC_AI_TOOLS.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => setActiveTool(tool)}
                className="flex w-full items-center gap-3 px-3 py-3 text-right active:bg-violet-50/80 dark:active:bg-violet-950/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-exeer-primary">
                    {tool.title}
                  </p>
                  <p className="text-[11px] text-exeer-muted">{tool.subtitle}</p>
                </div>
                <ChevronLeft
                  className="h-4 w-4 shrink-0 text-exeer-muted"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <StrategicAiInsightModal
        isOpen={Boolean(activeTool)}
        onClose={() => setActiveTool(null)}
        tool={activeTool}
      />
    </>
  );
}
