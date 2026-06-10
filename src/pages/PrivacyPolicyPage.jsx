import { brandAssets } from "../assets/brandAssets.js";
import {
  EXEER_PRIVACY_POLICY_LAST_UPDATED_AR,
  EXEER_PRIVACY_POLICY_SECTIONS_AR,
} from "../constants/exeerPrivacyPolicy.js";

export default function PrivacyPolicyPage() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-white font-sans text-slate-800"
    >
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <header className="mb-10 flex flex-col items-center gap-4 border-b border-slate-200 pb-8 text-center">
          <img
            src={brandAssets.logoDark}
            alt="Exeer"
            className="h-12 w-auto object-contain"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">سياسة الخصوصية</h1>
            <p className="text-sm text-slate-500">
              {EXEER_PRIVACY_POLICY_LAST_UPDATED_AR}
            </p>
          </div>
        </header>

        <article className="space-y-8 text-sm leading-8 text-slate-700">
          {EXEER_PRIVACY_POLICY_SECTIONS_AR.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-base font-bold text-slate-900">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
