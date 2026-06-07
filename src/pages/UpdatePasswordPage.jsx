import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExeerLogo from "../components/brand/ExeerLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../utils/supabaseClient.js";
import { getAuthenticatedHomePath } from "../constants/roles.js";
import { detectIsMobile } from "../hooks/useIsMobile.js";
import LocaleShell from "../components/ui/LocaleShell.jsx";

const INPUT_CLASS = "md-input";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { isBootstrapping, role } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function ensureInviteSession() {
      const {
        data: { session },
        error: sessionLookupError,
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionLookupError) {
        setSessionError(sessionLookupError.message || "تعذّر التحقق من الرابط.");
        return;
      }

      if (session) {
        setSessionReady(true);
        return;
      }

      const hash = window.location.hash?.replace(/^#/, "") ?? "";
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: setSessionErrorResult } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (setSessionErrorResult) {
          setSessionError(
            setSessionErrorResult.message || "رابط الدعوة غير صالح أو منتهي.",
          );
          return;
        }

        setSessionReady(true);
        return;
      }

      setSessionError("رابط إعداد كلمة المرور غير صالح. اطلب دعوة جديدة من الموارد البشرية.");
    }

    ensureInviteSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      const isMobile = detectIsMobile();
      const destination = getAuthenticatedHomePath(role ?? "Employee", isMobile);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "تعذّر حفظ كلمة المرور.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const waitingForAuth = isBootstrapping || (!sessionReady && !sessionError);

  return (
    <LocaleShell className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10 font-sans">
      <div className="mb-8 flex w-full max-w-md flex-col items-center">
        <ExeerLogo onLightBackground className="h-14 w-auto object-contain" />
      </div>

      <div className="w-full max-w-md rounded-md border border-gray-200 bg-white p-8 shadow-none">
        <h1 className="mb-2 text-center text-xl font-bold text-exeer-primary">
          إعداد كلمة المرور
        </h1>
        <p className="mb-6 text-center text-sm text-exeer-muted">
          أنشئ كلمة مرور لتفعيل حسابك والدخول إلى بوابة الموظف
        </p>

        {waitingForAuth ? (
          <p className="py-8 text-center text-sm text-exeer-muted">
            جاري التحقق من رابط الدعوة...
          </p>
        ) : sessionError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {sessionError}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-exeer-primary">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-exeer-primary">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={INPUT_CLASS}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !sessionReady}
              className="md-btn-primary w-full"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ والدخول"}
            </button>
          </form>
        )}
      </div>
    </LocaleShell>
  );
}
