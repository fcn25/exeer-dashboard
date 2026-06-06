import { useState } from "react";
import {
  Activity,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { STRATEGIC_AI_TOOLS } from "../../services/strategicAiService.js";
import StrategicAiInsightModal from "./StrategicAiInsightModal.jsx";

const TOOL_ICONS = {
  "executive-health": Activity,
  "performance-predictions": TrendingUp,
  "management-recommendations": Lightbulb,
};

export default function SmartExecutiveAssistantSection({ className = "" }) {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/30 dark:via-[#0f172a] dark:to-indigo-950/20 sm:p-6 ${className}`}
        aria-labelledby="smart-executive-assistant-heading"
      >
        <div
          className="pointer-events-none absolute -start-8 -top-8 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/15 text-lg shadow-sm">
              ✨
            </span>
            <div>
              <h2
                id="smart-executive-assistant-heading"
                className="text-lg font-semibold text-exeer-primary sm:text-xl"
              >
                المساعد الإداري الذكي
              </h2>
              <p className="mt-1 max-w-xl text-sm text-exeer-muted">
                أدوات استراتيجية مدعومة بالذكاء الاصطناعي لدعم قراراتك الإدارية
                بناءً على بيانات منشأتك.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300 sm:text-xs">
            <Sparkles className="h-3 w-3" aria-hidden />
            AI
          </span>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {STRATEGIC_AI_TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.id] ?? Sparkles;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool)}
                className="group flex flex-col rounded-xl border border-white/80 bg-white/90 p-4 text-right shadow-sm transition-all hover:border-violet-300/60 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-violet-700/50"
              >
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 transition-colors group-hover:bg-violet-500/15 dark:text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-exeer-primary">
                  {tool.title}
                </span>
                <span className="mt-1 text-xs text-exeer-muted">
                  {tool.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <StrategicAiInsightModal
        isOpen={Boolean(activeTool)}
        onClose={() => setActiveTool(null)}
        tool={activeTool}
      />
    </>
  );
}
