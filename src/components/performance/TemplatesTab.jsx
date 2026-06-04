import { useState } from "react";
import { Eye } from "lucide-react";
import { TEMPLATE_PILLARS } from "../../constants/performanceTemplates.js";
import SuccessToast from "../ui/SuccessToast.jsx";
import TemplatePreviewModal from "./TemplatePreviewModal.jsx";

function TemplateCard({ template, onSelect }) {
  const Icon = template.icon;

  return (
    <article className="group flex flex-col gap-2 rounded-md border border-exeer-border bg-md-surface p-3 text-right transition-colors hover:border-md-primary/35 hover:bg-exeer-hover">
      <button
        type="button"
        onClick={() => onSelect(template)}
        className="flex flex-col gap-2 text-right"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-slate-900 transition-colors group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
          <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
        </span>
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-exeer-primary">
          {template.title}
        </h4>
      </button>
      <button
        type="button"
        onClick={() => onSelect(template)}
        className="inline-flex min-h-[36px] items-center justify-center gap-1.5 self-end rounded-md border border-gray-200 px-3 text-xs font-medium text-slate-700 hover:bg-gray-50"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
        عرض
      </button>
    </article>
  );
}

function PillarSection({ pillar, onSelectTemplate }) {
  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-base font-bold text-exeer-primary">{pillar.title}</h3>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pillar.templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={{
              ...template,
              pillarId: pillar.id,
              pillarTitle: pillar.title,
            }}
            onSelect={onSelectTemplate}
          />
        ))}
      </div>
    </section>
  );
}

export default function TemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  const handleCycleLaunched = (cycleName) => {
    const label = cycleName?.trim() || "التقييم";
    setSuccessToast(`تم إطلاق دورة «${label}» بنجاح.`);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">مكتبة نماذج التقييم</h2>
          <p className="text-sm text-exeer-muted">
            اختر نموذجاً لمعاينة المعايير وإطلاق دورة تقييم.
          </p>
        </div>

        <div className="space-y-6">
          {TEMPLATE_PILLARS.map((pillar) => (
            <PillarSection
              key={pillar.id}
              pillar={pillar}
              onSelectTemplate={setSelectedTemplate}
            />
          ))}
        </div>
      </div>

      <TemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onCycleLaunched={handleCycleLaunched}
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </>
  );
}
