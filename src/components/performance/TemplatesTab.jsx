import { useState } from "react";
import { TEMPLATE_PILLARS } from "../../constants/performanceTemplates.js";
import SuccessToast from "../ui/SuccessToast.jsx";
import TemplatePreviewDrawer from "./TemplatePreviewDrawer.jsx";

function TemplateCard({ template, onSelect }) {
  const Icon = template.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex flex-col gap-2 rounded-xl border border-exeer-border bg-md-surface p-3 text-right transition-colors hover:border-md-primary/35 hover:bg-exeer-hover"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-exeer-surface text-exeer-primary transition-colors group-hover:bg-md-primary group-hover:text-white dark:group-hover:bg-[#2563eb]">
        <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
      </span>
      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-exeer-primary">
        {template.title}
      </h4>
    </button>
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

      <TemplatePreviewDrawer
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
