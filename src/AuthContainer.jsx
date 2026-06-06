import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthenticatedHomePath } from "./constants/roles.js";
import { detectIsMobile } from "./hooks/useIsMobile.js";
import { useAuth } from "./context/AuthContext.jsx";
import { signInWithEmail, signUpCompany, SIGNUP_SUCCESS_MESSAGE } from "./services/authService.js";
import { formatErrorMessage } from "./utils/formatErrorMessage.js";
import ExeerLogo from "./components/brand/ExeerLogo.jsx";

const INPUT_CLASS = "md-input";

function AuthMessage({ type, children }) {
  if (!children) return null;

  const toneClass =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <p
      className={`rounded-md border px-4 py-3 text-center text-sm ${toneClass}`}
      style={{ boxShadow: "none" }}
    >
      {children}
    </p>
  );
}

export default function AuthContainer() {
  const [authView, setAuthView] = useState("login");
  const [successMessage, setSuccessMessage] = useState("");

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10 font-sans"
    >
      <div className="mb-8 flex w-full max-w-md flex-col items-center">
        <ExeerLogo onLightBackground className="h-14 w-auto object-contain" />
      </div>

      <div className="w-full max-w-md rounded-md border border-gray-200 bg-white p-8 shadow-none">
        {authView === "login" ? (
          <LoginView
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
            onForgot={() => {
              setSuccessMessage("");
              setAuthView("forgot");
            }}
            onSignup={() => {
              setSuccessMessage("");
              setAuthView("signup");
            }}
          />
        ) : null}

        {authView === "signup" ? (
          <SignupView
            onLogin={() => {
              setSuccessMessage("");
              setAuthView("login");
            }}
          />
        ) : null}

        {authView === "forgot" ? (
          <ForgotPasswordView
            onBack={() => {
              setSuccessMessage("");
              setAuthView("login");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function LoginView({
  successMessage,
  setSuccessMessage,
  onForgot,
  onSignup,
}) {
  const navigate = useNavigate();
  const { hydrateSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsLoading(true);

    try {
      const { session } = await signInWithEmail(email, password);
      if (!session) {
        setError("تحقق من بريدك الإلكتروني لتفعيل الحساب.");
        return;
      }

      const profile = await hydrateSession(session);
      navigate(
        getAuthenticatedHomePath(profile?.role, detectIsMobile()),
        { replace: true },
      );
    } catch (err) {
      setError(err.message || "بيانات الدخول غير صحيحة.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center text-xl font-bold text-slate-900">
        مرحباً بك
      </h1>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthMessage type="success">{successMessage}</AuthMessage>
        <AuthMessage type="error">{error}</AuthMessage>

        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            كلمة المرور
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <button
          type="button"
          onClick={onForgot}
          className="self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          نسيت كلمة المرور؟
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ليس لديك حساب؟{" "}
        <button
          type="button"
          onClick={onSignup}
          className="font-semibold text-slate-900 hover:underline"
        >
          سجل الآن
        </button>
      </p>
    </>
  );
}

function SignupView({ onLogin }) {
  const [companyName, setCompanyName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (
      !companyName.trim() ||
      !adminFullName.trim() ||
      !adminEmail.trim() ||
      !password ||
      !agreedToTerms
    ) {
      setError("يرجى تعبئة جميع الحقول والموافقة على الشروط.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await signUpCompany({
        companyName,
        adminFullName,
        adminEmail,
        password,
      });
      setCompanyName("");
      setAdminFullName("");
      setAdminEmail("");
      setPassword("");
      setAgreedToTerms(false);
      setSuccessMessage(result.successMessage ?? SIGNUP_SUCCESS_MESSAGE);
    } catch (err) {
      setSuccessMessage("");
      setError(formatErrorMessage(err, "تعذّر إنشاء الحساب."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="mb-6 text-center text-xl font-bold text-slate-900">
        إنشاء حساب جديد
      </h1>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthMessage type="success">{successMessage}</AuthMessage>
        <AuthMessage type="error">{error}</AuthMessage>

        <div>
          <label
            htmlFor="company-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            اسم المنشأة
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="admin-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            اسم المدير الكامل
          </label>
          <input
            id="admin-name"
            type="text"
            value={adminFullName}
            onChange={(e) => setAdminFullName(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="admin-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            البريد الإلكتروني
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            كلمة المرور
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={INPUT_CLASS}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            disabled={isLoading}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0"
          />
          <span>أوافق على الشروط والأحكام</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        لديك حساب بالفعل؟{" "}
        <button
          type="button"
          onClick={onLogin}
          className="font-semibold text-slate-900 hover:underline"
        >
          تسجيل الدخول
        </button>
      </p>
    </>
  );
}

function ForgotPasswordView({ onBack }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <>
      <h1 className="mb-2 text-center text-xl font-bold text-slate-900">
        نسيت كلمة المرور؟
      </h1>
      <p className="mb-6 text-center text-sm leading-relaxed text-slate-500">
        أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق.
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {submitted ? (
          <AuthMessage type="success">
            تم إرسال رمز التحقق إلى بريدك الإلكتروني (واجهة تجريبية).
          </AuthMessage>
        ) : null}

        <div>
          <label
            htmlFor="forgot-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            البريد الإلكتروني
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <button
          type="submit"
          disabled={!email.trim()}
          className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          إرسال الرمز
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <button
          type="button"
          onClick={onBack}
          className="font-semibold text-slate-900 hover:underline"
        >
          العودة لتسجيل الدخول
        </button>
      </p>
    </>
  );
}
