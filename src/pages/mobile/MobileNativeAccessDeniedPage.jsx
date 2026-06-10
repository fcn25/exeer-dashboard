import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { brandAssets } from "../../assets/brandAssets.js";
import { signOut } from "../../utils/mobileAuth.js";

export default function MobileNativeAccessDeniedPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="native-mobile-shell flex min-h-screen flex-col items-center justify-center bg-md-surface-dim px-6 text-center dark:bg-[var(--bg-main)]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        <img
          src={brandAssets.logoDark}
          alt="Exeer"
          className="mx-auto h-16 w-auto dark:hidden"
        />
        <img
          src={brandAssets.logoLight}
          alt="Exeer"
          className="mx-auto hidden h-16 w-auto dark:block"
        />

        <p className="text-base font-semibold leading-relaxed text-exeer-primary dark:text-[var(--text-primary)]">
          تطبيق المدراء فقط — سيتوفر تطبيق الموظفين قريباً
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="md-btn-primary inline-flex w-full items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
