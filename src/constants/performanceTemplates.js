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
