import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function UnauthorizedPage() {
  const { homePath } = useAuth();

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex min-h-screen flex-col items-center justify-center bg-md-surface-dim px-6 text-center"
    >
      <div className="md-surface max-w-md space-y-6 p-8">
        <ShieldX
          className="mx-auto h-14 w-14 text-red-600 dark:text-red-400"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-exeer-primary">403 — غير مصرّح</h1>
        <p className="text-sm leading-relaxed text-exeer-muted">
          لا تملك الصلاحية للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا خطأ، تواصل
          مع مالك المنشأة.
        </p>
        <Link to={homePath} className="md-btn-primary inline-flex">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
