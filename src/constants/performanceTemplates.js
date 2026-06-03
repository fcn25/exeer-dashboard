import {
  Brain,
  Building2,
  ClipboardCheck,
  Factory,
  Handshake,
  Headphones,
  Landmark,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Package,
  Scale,
  Server,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

export const PERFORMANCE_TABS = [
  { id: "templates", label: "نماذج التقييم" },
  { id: "cycles", label: "دورات التقييم" },
  { id: "summary", label: "الملخص التنفيذي" },
];

export const TEMPLATE_PILLARS = [
  {
    id: "leadership",
    title: "محور القيادة والنضج المؤسسي",
    accent: "from-slate-50 to-indigo-50/70 dark:from-slate-900/40 dark:to-indigo-950/25",
    border: "border-indigo-100/80 dark:border-indigo-900/35",
    templates: [
      {
        id: "org-maturity",
        title: "النضج المؤسسي",
        icon: Landmark,
      },
      {
        id: "gm-evaluation",
        title: "تقييم المدراء العام",
        icon: UserCog,
      },
      {
        id: "org-evaluation",
        title: "تقييم المنشأة",
        icon: Building2,
      },
    ],
  },
  {
    id: "operational",
    title: "محور الانضباط والكفاءة التشغيلية",
    accent: "from-slate-50 to-emerald-50/70 dark:from-slate-900/40 dark:to-emerald-950/25",
    border: "border-emerald-100/80 dark:border-emerald-900/35",
    templates: [
      {
        id: "production-lines",
        title: "كفاءة خطوط الإنتاج",
        icon: Factory,
      },
      {
        id: "supply-chain",
        title: "كفاءة سلاسل الإمداد والمخزون",
        icon: Package,
      },
      {
        id: "financial-compliance",
        title: "الكفاءة المالية والامتثال",
        icon: Scale,
      },
    ],
  },
  {
    id: "innovation",
    title: "محور الابتكار والجاهزية للمستقبل",
    accent: "from-slate-50 to-violet-50/70 dark:from-slate-900/40 dark:to-violet-950/25",
    border: "border-violet-100/80 dark:border-violet-900/35",
    templates: [
      {
        id: "hr-services",
        title: "جودة خدمات الموارد البشرية",
        icon: Users,
      },
      {
        id: "digital-ai-readiness",
        title: "الجاهزية الرقمية والذكاء الاصطناعي",
        icon: Brain,
      },
      {
        id: "innovation-engagement",
        title: "الابتكار والارتباط الوظيفي",
        icon: Lightbulb,
      },
    ],
  },
  {
    id: "harmony-cx",
    title: "محور التناغم وتجربة العملاء",
    accent: "from-slate-50 to-sky-50/70 dark:from-slate-900/40 dark:to-sky-950/25",
    border: "border-sky-100/80 dark:border-sky-900/35",
    templates: [
      {
        id: "sales-effectiveness",
        title: "فعالية فريق المبيعات",
        icon: Handshake,
      },
      {
        id: "brand-marketing",
        title: "قوة العلامة التجارية والتسويق",
        icon: Megaphone,
      },
      {
        id: "tech-support",
        title: "كفاءة البنية التقنية والدعم الفني",
        icon: Server,
      },
      {
        id: "customer-experience",
        title: "جودة تجربة العميل والاتصال",
        icon: Headphones,
      },
    ],
  },
  {
    id: "individual-efficiency",
    title: "مؤشرات الكفاءة الفردية",
    accent: "from-slate-50 to-amber-50/70 dark:from-slate-900/40 dark:to-amber-950/25",
    border: "border-amber-100/80 dark:border-amber-900/35",
    templates: [
      {
        id: "self-evaluation",
        title: "التقييم الذاتي للموظف",
        icon: UserCheck,
      },
      {
        id: "professional-fitness",
        title: "اختبار اللياقة المهنية",
        icon: ClipboardCheck,
      },
      {
        id: "manager-evaluation",
        title: "تقييم المدير للموظف",
        icon: MessageCircle,
      },
    ],
  },
];

/** Read-only preview sections shown in the template drawer (placeholder until DB-backed criteria exist). */
export const TEMPLATE_PREVIEW_SECTIONS = {
  "org-maturity": [
    {
      title: "الهيكلة والحوكمة",
      questions: [
        "مدى وضوح الهيكل التنظيمي وصلاحيات اتخاذ القرار",
        "فعالية آليات الحوكمة والرقابة الداخلية",
        "مستوى توثيق السياسات والإجراءات المؤسسية",
      ],
    },
    {
      title: "النضج الاستراتيجي",
      questions: [
        "اتساق الأهداف الاستراتيجية مع العمليات اليومية",
        "قدرة المنشأة على قياس ومراجعة الأداء المؤسسي",
      ],
    },
  ],
  "gm-evaluation": [
    {
      title: "القيادة والتوجيه",
      questions: [
        "وضوح الرؤية وتحفيز الفرق على تحقيق الأهداف",
        "جودة اتخاذ القرارات في المواقف الحرجة",
      ],
    },
    {
      title: "إدارة الأداء",
      questions: [
        "متابعة مؤشرات الأداء الرئيسية بشكل دوري",
        "تطوير الكفاءات القيادية داخل الفريق",
      ],
    },
  ],
  "org-evaluation": [
    {
      title: "الأداء المؤسسي",
      questions: [
        "تحقيق أهداف الإيرادات والربحية المخططة",
        "كفاءة استخدام الموارد والميزانيات",
      ],
    },
    {
      title: "الاستدامة",
      questions: [
        "جاهزية المنشأة للتوسع أو التحول",
        "مستوى المخاطر التشغيلية والامتثال",
      ],
    },
  ],
  "production-lines": [
    {
      title: "كفاءة الإنتاج",
      questions: [
        "معدل استغلال خطوط الإنتاج",
        "نسبة الهدر والتوقفات غير المخططة",
      ],
    },
    {
      title: "الجودة",
      questions: [
        "معدل العيوب وإعادة العمل",
        "الالتزام بمعايير السلامة المهنية",
      ],
    },
  ],
  "supply-chain": [
    {
      title: "سلاسل الإمداد",
      questions: [
        "دقة التنبؤ بالطلب وإدارة المخزون",
        "زمن دورة التوريد من المورد إلى التسليم",
      ],
    },
  ],
  "financial-compliance": [
    {
      title: "الكفاءة المالية",
      questions: [
        "الالتزام بالميزانية والتكلفة لكل وحدة",
        "دقة التقارير المالية ومواعيد إغلاقها",
      ],
    },
    {
      title: "الامتثال",
      questions: [
        "الالتزام بالأنظمة واللوائح ذات الصلة",
        "اكتمال مستندات التدقيق والمراجعة",
      ],
    },
  ],
  "hr-services": [
    {
      title: "جودة الخدمات",
      questions: [
        "سرعة الاستجابة لطلبات الموظفين",
        "رضا الموظفين عن خدمات الموارد البشرية",
      ],
    },
  ],
  "digital-ai-readiness": [
    {
      title: "الجاهزية الرقمية",
      questions: [
        "نضج الأنظمة الرقمية الأساسية",
        "أمن المعلومات وحماية البيانات",
      ],
    },
    {
      title: "الذكاء الاصطناعي",
      questions: [
        "مدى استخدام أدوات الذكاء الاصطناعي في العمليات",
        "جاهزية الفريق للتبني التدريجي للتقنيات",
      ],
    },
  ],
  "innovation-engagement": [
    {
      title: "الابتكار",
      questions: [
        "عدد المبادرات التحسينية المقترحة والمنفذة",
        "تشجيع ثقافة التجريب والتعلم",
      ],
    },
    {
      title: "الارتباط الوظيفي",
      questions: [
        "مستوى مشاركة الموظفين في الأهداف",
        "معدل الاحتفاظ بالمواهب",
      ],
    },
  ],
  "sales-effectiveness": [
    {
      title: "فعالية المبيعات",
      questions: [
        "تحقيق أهداف المبيعات الشهرية/الربع سنوية",
        "جودة pipeline وإغلاق الصفقات",
      ],
    },
  ],
  "brand-marketing": [
    {
      title: "العلامة والتسويق",
      questions: [
        "وضوح رسالة العلامة التجارية",
        "فعالية الحملات التسويقية على التحويل",
      ],
    },
  ],
  "tech-support": [
    {
      title: "البنية التقنية",
      questions: [
        "استقرار الأنظمة وتوفر الخدمة",
        "زمن حل الحوادث التقنية",
      ],
    },
  ],
  "customer-experience": [
    {
      title: "تجربة العميل",
      questions: [
        "رضا العملاء عن نقاط التواصل",
        "سرعة الاستجابة للشكاوى والاستفسارات",
      ],
    },
  ],
  "self-evaluation": [
    {
      title: "التقييم الذاتي",
      questions: [
        "تحقيق الأهداف الفردية للفترة",
        "المهارات التي تم تطويرها",
        "مجالات التحسين الشخصي",
      ],
    },
  ],
  "professional-fitness": [
    {
      title: "اللياقة المهنية",
      questions: [
        "ملاءمة المهارات للدور الحالي",
        "الاستعداد للمهام الأكثر تعقيداً",
      ],
    },
  ],
  "manager-evaluation": [
    {
      title: "تقييم المدير",
      questions: [
        "جودة التوجيه والتغذية الراجعة",
        "دعم نمو الموظف وتطوير مساره",
      ],
    },
  ],
};

export function getTemplatePreviewSections(template) {
  const specific = TEMPLATE_PREVIEW_SECTIONS[template?.id];
  if (specific?.length) return specific;

  return [
    {
      title: "معايير التقييم",
      questions: [
        "مدى تحقيق الأهداف المحددة للفترة",
        "جودة المخرجات والالتزام بالمعايير",
        "التعاون والتواصل مع الفريق",
      ],
    },
    {
      title: "ملاحظات عامة",
      questions: [
        "ما أبرز نقاط القوة؟",
        "ما مجالات التحسين المقترحة؟",
      ],
    },
  ];
}
