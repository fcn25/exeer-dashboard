import { useState } from "react";
import { X } from "lucide-react";
import { TEMPLATE_PILLARS } from "../../constants/performanceTemplates.js";

function TemplateSetupModal({ template, onClose }) {
  if (!template) return null;

  const Icon = template.icon;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-setup-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-t-3xl bg-md-surface p-6 sm:rounded-3xl sm:p-8 md-elevated">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-exeer-surface text-exeer-primary">
              <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2
                id="template-setup-title"
                className="text-lg font-bold text-exeer-primary sm:text-xl"
              >
                إعداد نموذج: {template.title}
              </h2>
              <p className="text-sm text-exeer-muted">{template.pillarTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="md-surface-muted rounded-2xl px-5 py-10 text-center">
          <p className="text-sm leading-relaxed text-exeer-muted">
            سيتم بناء نموذج التقييم هنا...
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="md-btn-primary min-w-[120px]">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onSelect }) {
  const Icon = template.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex min-h-[168px] flex-col gap-4 rounded-2xl bg-white p-5 text-right shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-[#1e293b]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-exeer-surface text-exeer-primary transition-colors group-hover:bg-md-primary group-hover:text-white">
        <Icon className="h-6 w-6 stroke-[1.75]" aria-hidden />
      </span>
      <h4 className="text-base font-bold leading-snug text-exeer-primary">
        {template.title}
      </h4>
    </button>
  );
}

function PillarSection({ pillar, onSelectTemplate }) {
  return (
    <section className="space-y-5">
      <header>
        <h3 className="text-lg font-bold text-exeer-primary md:text-xl">
          {pillar.title}
        </h3>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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

  return (
    <>
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">مكتبة نماذج التقييم</h2>
          <p className="text-sm text-exeer-muted">
            اختر نموذجاً لبدء إعداده — كل نموذج يفتح في نافذة مستقلة.
          </p>
        </div>

        <div className="space-y-8">
          {TEMPLATE_PILLARS.map((pillar) => (
            <PillarSection
              key={pillar.id}
              pillar={pillar}
              onSelectTemplate={setSelectedTemplate}
            />
          ))}
        </div>
      </div>

      <TemplateSetupModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </>
  );
}
