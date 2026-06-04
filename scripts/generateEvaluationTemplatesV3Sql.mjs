#!/usr/bin/env node
/**
 * Generates Supabase SQL to upsert all 17 evaluation templates with v3 categories.
 * Usage: node scripts/generateEvaluationTemplatesV3Sql.mjs > supabase/migrations/20250632000000_seed_evaluation_templates_v3_full.sql
 */

function q(id, textAr, type = "rating_1_5", extra = {}) {
  return {
    id,
    type,
    text_ar: textAr,
    text_en: extra.text_en ?? textAr,
    ...extra,
  };
}

function criterion(titleAr, questions) {
  return { title_ar: titleAr, questions };
}

function category(titleAr, criteria) {
  return { title_ar: titleAr, criteria };
}

/** Split multi-question criteria into separate preview rows (3+ per category). */
function expandCategories(categories) {
  return categories.map((cat) => ({
    title_ar: cat.title_ar,
    criteria: cat.criteria.flatMap((crit) =>
      crit.questions.length > 1
        ? crit.questions.map((question) => ({
            title_ar:
              question.text_ar.length > 80
                ? `${question.text_ar.slice(0, 80)}…`
                : question.text_ar,
            questions: [question],
          }))
        : [crit],
    ),
  }));
}

function buildPayload({ category: cat, title_en, title_ar, categories }) {
  const normalizedCategories = expandCategories(categories);
  const flat = [];
  for (const catBlock of normalizedCategories) {
    for (const crit of catBlock.criteria) {
      for (const question of crit.questions) {
        flat.push(question);
      }
    }
  }
  return {
    version: 3,
    title_en,
    title_ar,
    categories: normalizedCategories,
    questions: flat,
  };
}

const TEMPLATES = [
  {
    category: "HR",
    title_en: "HR Service Quality Evaluation",
    title_ar: "تقييم جودة خدمات الموارد البشرية",
    categories: [
      category("جودة الخدمة والاستجابة", [
        criterion("سرعة الاستجابة لطلبات الموظفين", [
          q("hr-1", "ما مدى سرعة استجابة قسم الموارد البشرية على استفساراتك وطلباتك خلال الفترة الأخيرة؟"),
          q("hr-2", "ما مدى وضوح الإجراءات والخطوات المطلوبة عند تقديم طلب للموارد البشرية؟"),
          q("hr-3", "ما مدى رضاك عن جودة التواصل والمتابعة حتى إغلاق الطلب؟"),
        ]),
      ]),
      category("التطوير والعدالة", [
        criterion("التطوير المهني والحوافز", [
          q("hr-4", "ما مدى ملاءمة البرامج التدريبية لمسارك المهني واحتياجاتك الحالية؟"),
          q("hr-5", "ما مدى عدالة نظام المكافآت والترقيات من وجهة نظرك؟"),
          q("hr-6", "ما مدى فعالية قسم الموارد البشرية في دعم حل النزاعات أو الملاحظات الوظيفية؟"),
        ]),
      ]),
    ],
  },
  {
    category: "General",
    title_en: "Company Survey",
    title_ar: "استبيان الشركة العام",
    categories: [
      category("بيئة العمل والموارد", [
        criterion("بيئة العمل", [
          q("org-1", "ما مدى رضاك عن بيئة العمل والمرافق المتاحة لأداء مهامك؟"),
          q("org-2", "ما مدى توفر الأدوات والموارد اللازمة لإنجاز عملك بكفاءة؟"),
          q("org-3", "ما مدى دعم المنشأة لتحقيق التوازن بين العمل والحياة؟"),
        ]),
      ]),
      category("القيادة والاستدامة", [
        criterion("الرؤية والحوكمة", [
          q("org-4", "ما مدى وضوح رؤية الإدارة وأولويات المنشأة لديك؟"),
          q("org-5", "ما مدى ثقتك في قدرة المنشأة على تحقيق أهدافها الاستراتيجية؟"),
          q("org-6", "ما مدى شعورك بالانتماء والفخر بالعمل في هذه المنشأة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Compliance",
    title_en: "Professional Fitness Assessment",
    title_ar: "تقييم اللياقة المهنية",
    categories: [
      category("الامتثال والمؤهلات", [
        criterion("التراخيص والشهادات", [
          q("fit-1", "هل تحمل جميع التراخيص والشهادات المهنية المطلوبة لدورك الحالي؟", "boolean"),
          q("fit-2", "ما مدى التزامك بتحديث مؤهلاتك المهنية وفق المتطلبات النظامية؟"),
          q("fit-3", "ما مدى اكتمال ملفك المهني والوثائق الرسمية في سجلات المنشأة؟"),
        ]),
      ]),
      category("الجاهزية والسلامة", [
        criterion("اللياقة الوظيفية", [
          q("fit-4", "ما مدى قدرتك البدنية والذهنية على أداء مهام عملك الحالية؟"),
          q("fit-5", "ما مدى التزامك بمعايير السلامة المهنية وإجراءات الجودة؟"),
          q("fit-6", "ما مدى استعدادك للمهام ذات المسؤولية الأعلى خلال الاثني عشر شهراً القادمة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Management",
    title_en: "Executive and Department Head Evaluation",
    title_ar: "تقييم التنفيذيين ومدراء الأقسام",
    categories: [
      category("القيادة والتوجيه", [
        criterion("القيادة الاستراتيجية", [
          q("gm-1", "ما مدى وضوح الرؤية التي يقدمها المدير للفريق وربطها بالأهداف؟"),
          q("gm-2", "ما مدى جودة قرارات المدير في المواقف الحرجة والمعقدة؟"),
          q("gm-3", "ما مدى قدرة المدير على تحفيز الفريق وإدارة التغيير؟"),
        ]),
      ]),
      category("إدارة الأداء", [
        criterion("المتابعة والتطوير", [
          q("gm-4", "ما مدى فعالية المدير في متابعة مؤشرات الأداء الرئيسية للقسم؟"),
          q("gm-5", "ما مدى دعم المدير لتطوير الكفاءات القيادية داخل الفريق؟"),
          q("gm-6", "ما مدى عدالة المدير في توزيع المهام وتقييم الأداء؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Management",
    title_en: "Manager to Employee Form",
    title_ar: "نموذج تقييم المدير للموظف",
    categories: [
      category("جودة الأداء", [
        criterion("تحقيق الأهداف", [
          q("me-1", "ما مدى تحقيق الموظف للأهداف والمؤشرات المحددة للفترة؟"),
          q("me-2", "ما مدى جودة مخرجات العمل والالتزام بالمواعيد النهائية؟"),
          q("me-3", "ما مدى قدرة الموظف على العمل تحت الضغط مع الحفاظ على الجودة؟"),
        ]),
      ]),
      category("السلوكيات والتطوير", [
        criterion("التعاون والنمو", [
          q("me-4", "ما مدى فعالية الموظف في التعاون والتواصل مع الزملاء والإدارات؟"),
          q("me-5", "ما مدى استجابة الموظف للتغذية الراجعة وخطط التطوير؟"),
          q("me-6", "ما مدى جاهزية الموظف لتحمل مسؤوليات أكبر في المستقبل القريب؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Strategy",
    title_en: "Institutional Maturity Assessment",
    title_ar: "تقييم النضج المؤسسي",
    categories: [
      category("الهيكلة والحوكمة", [
        criterion("الحوكمة المؤسسية", [
          q("mat-1", "ما مدى وضوح الهيكل التنظيمي وصلاحيات اتخاذ القرار في المنشأة؟"),
          q("mat-2", "ما مدى فعالية آليات الرقابة الداخلية والامتثال؟"),
          q("mat-3", "ما مدى اكتمال وتحديث السياسات والإجراءات المؤسسية؟"),
        ]),
      ]),
      category("النضج الاستراتيجي", [
        criterion("التخطيط والتنفيذ", [
          q("mat-4", "ما مدى اتساق الأهداف الاستراتيجية مع العمليات اليومية؟"),
          q("mat-5", "ما مدى قدرة المنشأة على قياس ومراجعة الأداء المؤسسي دورياً؟"),
          q("mat-6", "ما مدى جاهزية المنشأة للتوسع أو التحول وفق خطة واضحة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Culture",
    title_en: "Innovation Culture and Employee Engagement Survey",
    title_ar: "استبيان ثقافة الابتكار والارتباط الوظيفي",
    categories: [
      category("الابتكار", [
        criterion("ثقافة التحسين", [
          q("inn-1", "ما مدى تشجيع المنشأة على اقتراح أفكار تطويرية جديدة؟"),
          q("inn-2", "ما مدى سرعة تنفيذ المبادرات التحسينية المعتمدة؟"),
          q("inn-3", "ما مدى توفر الأدوات والتقنيات الداعمة للابتكار في عملك؟"),
        ]),
      ]),
      category("الارتباط الوظيفي", [
        criterion("الانتماء والاحتفاظ", [
          q("inn-4", "ما مدى شعورك بالتقدير عند تقديم جهد استثنائي؟"),
          q("inn-5", "ما مدى مشاركتك في أهداف الفريق والمنشأة؟"),
          q("inn-6", "ما مدى رغبتك في الاستمرار في المنشأة خلال السنوات القادمة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Technology",
    title_en: "Digital Readiness and AI Assessment",
    title_ar: "تقييم الجاهزية الرقمية والذكاء الاصطناعي",
    categories: [
      category("الجاهزية الرقمية", [
        criterion("البنية والأنظمة", [
          q("dig-1", "ما مدى نضج الأنظمة الرقمية الأساسية في دعم عملك اليومي؟"),
          q("dig-2", "ما مدى فعالية حماية البيانات وأمن المعلومات في منشأتك؟"),
          q("dig-3", "ما مدى سهولة الوصول للبيانات والتقارير اللازمة لاتخاذ القرار؟"),
        ]),
      ]),
      category("الذكاء الاصطناعي", [
        criterion("التبني والمهارات", [
          q("dig-4", "ما مدى وعيك بأدوات الذكاء الاصطناعي المفيدة لمهامك؟"),
          q("dig-5", "ما مدى استعدادك لتبني حلول ذكية لأتمتة المهام المتكررة؟"),
          q("dig-6", "ما مدى جودة التدريب المقدم على المهارات الرقمية والذكاء الاصطناعي؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Sales",
    title_en: "Sales Team Effectiveness Evaluation",
    title_ar: "تقييم فعالية فريق المبيعات",
    categories: [
      category("أداء المبيعات", [
        criterion("تحقيق الأهداف", [
          q("sal-1", "ما مدى تحقيقك لهدف المبيعات خلال الفترة الماضية؟", "rating_0_10"),
          q("sal-2", "ما مدى جودة العملاء المحتملين المقدمين لك من المنشأة؟"),
          q("sal-3", "ما مدى فعاليتك في إغلاق الصفقات وإدارة الاعتراضات؟"),
        ]),
      ]),
      category("العمليات والأدوات", [
        criterion("دعم المبيعات", [
          q("sal-4", "ما مدى ملاءمة سياسة التسعير الحالية للسوق؟"),
          q("sal-5", "ما مدى كفاية أدوات تتبع العملاء (CRM) لإدارة علاقاتك؟"),
          q("sal-6", "ما مدى وضوح عملية المبيعات من التسويق حتى التحصيل؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Finance",
    title_en: "Financial Efficiency and Compliance Evaluation",
    title_ar: "تقييم الكفاءة المالية والامتثال",
    categories: [
      category("الكفاءة المالية", [
        criterion("العمليات المالية", [
          q("fin-1", "ما مدى سرعة معالجة الطلبات والعمليات المالية لقسمك؟"),
          q("fin-2", "ما مدى وضوح النماذج والمتطلبات المالية المطلوبة منك؟"),
          q("fin-3", "ما مدى دقة البيانات المالية المشتركة داخل قسمك؟"),
        ]),
      ]),
      category("الامتثال والرقابة", [
        criterion("الحوكمة المالية", [
          q("fin-4", "ما مدى فائدة التقارير الدورية للميزانية مقابل المنفذ؟"),
          q("fin-5", "ما مدى فعالية السياسات المالية في الحد من الهدر؟"),
          q("fin-6", "ما مدى التزام قسمك بمتطلبات المراجعة والتدقيق الداخلي؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Customer Service",
    title_en: "Customer Experience and Communication Evaluation",
    title_ar: "تقييم تجربة العميل والتواصل",
    categories: [
      category("جودة تجربة العميل", [
        criterion("الاستجابة والاحترافية", [
          q("cx-1", "ما مدى سرعة استجابة الفريق لاستفسارات وشكاوى العملاء؟"),
          q("cx-2", "ما مدى احترافية التعامل مع العملاء في المواقف الصعبة؟"),
          q("cx-3", "ما مدى رضا العملاء عن جودة الحلول المقدمة؟"),
        ]),
      ]),
      category("الأنظمة والتمكين", [
        criterion("صلاحيات وقنوات الخدمة", [
          q("cx-4", "ما مدى كفاية صلاحيات الموظفين لحل مشاكل العملاء دون تصعيد؟"),
          q("cx-5", "ما مدى فعالية قنوات التواصل المتعددة (هاتف، واتساب، بريد)؟"),
          q("cx-6", "ما مدى سهولة الوصول لمعلومات العميل عبر الأنظمة الحالية؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Supply Chain",
    title_en: "Supply Chain and Inventory Efficiency Evaluation",
    title_ar: "تقييم كفاءة سلسلة الإمداد والمخزون",
    categories: [
      category("إدارة المخزون", [
        criterion("دقة المخزون", [
          q("sc-1", "ما مدى تطابق الجرد الفعلي مع بيانات النظام؟"),
          q("sc-2", "ما مدى دقة التنبؤ بالطلب وخطط إعادة التوريد؟"),
          q("sc-3", "ما مدى فعالية إجراءات التعامل مع المواد التالفة أو المتقادمة؟"),
        ]),
      ]),
      category("العمليات اللوجستية", [
        criterion("الاستلام والتسليم", [
          q("sc-4", "ما مدى سرعة وكفاءة عمليات الاستلام والتسليم في المستودع؟"),
          q("sc-5", "ما مدى الالتزام بمعايير السلامة والتخزين في المستودعات؟"),
          q("sc-6", "ما مدى صرامة ضوابط الدخول والخروج لمنع الفقد أو التلاعب؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Production",
    title_en: "Production Efficiency and Quality Evaluation",
    title_ar: "تقييم كفاءة الإنتاج والجودة",
    categories: [
      category("كفاءة الإنتاج", [
        criterion("خطوط الإنتاج", [
          q("prod-1", "ما مدى استمرارية تشغيل خطوط الإنتاج دون توقفات غير مخططة؟", "rating_0_100"),
          q("prod-2", "ما مدى كفاءة فريق الصيانة في معالجة الأعطال الطارئة؟"),
          q("prod-3", "ما مدى فعالية تخطيط الطاقة الإنتاجية لمواجهة ذروة الطلب؟"),
        ]),
      ]),
      category("الجودة والسلامة", [
        criterion("ضبط الجودة", [
          q("prod-4", "ما مدى التزام العمال بمعدات الوقاية الشخصية في منطقة الإنتاج؟"),
          q("prod-5", "ما مدى سرعة الاستجابة عند اكتشاف عيب أثناء التصنيع؟"),
          q("prod-6", "ما مدى ملاءمة بيئة الإنتاج (إضاءة، تهوية، تخطيط) للسلامة والتركيز؟"),
        ]),
      ]),
    ],
  },
  {
    category: "IT",
    title_en: "IT Infrastructure and Support Evaluation",
    title_ar: "تقييم البنية التحتية التقنية والدعم الفني",
    categories: [
      category("البنية التقنية", [
        criterion("الاستقرار والأداء", [
          q("it-1", "ما مدى استقرار الأنظمة وتوفر الخدمة خلال ساعات العمل؟"),
          q("it-2", "ما مدى سرعة استجابة الدعم الفني للتذاكر المفتوحة؟"),
          q("it-3", "ما مدى جودة الحلول الجذرية للمشاكل المتكررة؟"),
        ]),
      ]),
      category("الأمن والتمكين", [
        criterion("الأمن السيبراني", [
          q("it-4", "ما مدى وعي الموظفين بممارسات الأمن السيبراني الأساسية؟"),
          q("it-5", "ما مدى ملاءمة صلاحيات الوصول للبيانات دون تعقيد زائد؟"),
          q("it-6", "ما مدى جاهزية البنية لدعم التحول الرقمي في قسمك؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Procurement",
    title_en: "Procurement and Supply Chain Efficiency Evaluation",
    title_ar: "تقييم كفاءة المشتريات وسلاسل الإمداد",
    categories: [
      category("كفاءة المشتريات", [
        criterion("سرعة وجودة التوريد", [
          q("proc-1", "ما مدى سرعة تلبية طلبات الشراء بعد اعتمادها؟", "rating_0_100"),
          q("proc-2", "ما مدى مطابقة المواد الموردة لمواصفات أمر الشراء؟"),
          q("proc-3", "ما مدى فعالية إدارة الموردين وتقليل التأخير التشغيلي؟"),
        ]),
      ]),
      category("العقود والامتثال", [
        criterion("حوكمة المشتريات", [
          q("proc-4", "ما مدى كفاية العقود في حماية حقوق المنشأة؟"),
          q("proc-5", "ما مدى وضوح إجراءات اعتماد موردين جدد؟"),
          q("proc-6", "ما مدى الالتزام بإشعارات تجديد أو انتهاء العقود ذات الصلة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "Marketing",
    title_en: "Brand Strength and Marketing Effectiveness Evaluation",
    title_ar: "تقييم قوة العلامة التجارية وفعالية التسويق",
    categories: [
      category("العلامة التجارية", [
        criterion("الهوية والرسالة", [
          q("mkt-1", "ما مدى انعكاس الهوية البصرية لقيم المنشأة الحقيقية؟"),
          q("mkt-2", "ما مدى وضوح رسالة العلامة للعملاء والموظفين؟"),
          q("mkt-3", "ما مدى قوة الانطباع الأول لدى العملاء عن العلامة؟"),
        ]),
      ]),
      category("فعالية التسويق", [
        criterion("الحملات والقنوات", [
          q("mkt-4", "ما مدى فعالية الحملات التسويقية في زيادة الوعي والتحويل؟"),
          q("mkt-5", "ما مدى تفوق حملاتنا على المنافسين المباشرين في السوق؟"),
          q("mkt-6", "ما مدى انتظام تزويد الفرق بمواد ترويجية محدثة؟"),
        ]),
      ]),
    ],
  },
  {
    category: "General",
    title_en: "Employee Self Evaluation",
    title_ar: "التقييم الذاتي للموظف",
    categories: [
      category("الأداء والإنجاز", [
        criterion("تحقيق الأهداف", [
          q("self-1", "ما مدى التزامي بالأهداف المحددة لي خلال فترة التقييم؟"),
          q("self-2", "ما مدى جودة مخرجاتي والالتزام بالمعايير المتفق عليها؟"),
          q("self-3", "ما أبرز إنجازاتي التي أسهمت في نجاح الفريق؟", "text"),
        ]),
      ]),
      category("التطوير والتحسين", [
        criterion("نمو مهني", [
          q("self-4", "ما التحديات الرئيسية التي واجهتها وكيف تعاملت معها؟", "text"),
          q("self-5", "ما المهارات التي طورتها خلال الفترة الماضية؟", "text"),
          q("self-6", "ما مجالات التحسين التي أركز عليها في الفترة القادمة؟", "text"),
        ]),
      ]),
    ],
  },
];

const payloads = TEMPLATES.map((t) => ({
  category: t.category,
  title: t.title_ar,
  json: buildPayload(t),
}));

console.log(`-- Full v3 seed for ${payloads.length} evaluation templates
-- Run in Supabase SQL Editor after backup
-- Fixes empty criteria in Template Preview (categories → criteria → questions)

create unique index if not exists evaluation_templates_title_unique
  on public.evaluation_templates (title);

`);

for (const row of payloads) {
  const category = row.category.replace(/'/g, "''");
  const title = row.title.replace(/'/g, "''");
  const json = JSON.stringify(row.json).replace(/'/g, "''");

  console.log(`-- ${title}
insert into public.evaluation_templates (category, title, questions_jsonb)
select '${category}', '${title}', '${json}'::jsonb
where not exists (
  select 1 from public.evaluation_templates t where t.title = '${title}'
);

update public.evaluation_templates
set category = '${category}',
    questions_jsonb = '${json}'::jsonb
where title = '${title}';

`);
}

console.log(`-- Done: ${payloads.length} templates upserted with version 3 categories.`);
