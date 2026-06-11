import { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "../../utils/supabaseClient.js";

const STATE_LABELS = {
  idle: "إعادة إرسال الدعوة",
  sending: "جاري الإرسال…",
  sent: "تم الإرسال ✓",
  error: "فشل — تحقق من البريد",
};

export default function ResendInviteButton({ employee }) {
  const [state, setState] = useState("idle");

  const email = String(employee?.email ?? "").trim();
  const hasEmail = Boolean(email);
  const isSending = state === "sending";

  const handleClick = async () => {
    if (!hasEmail || isSending) return;

    setState("sending");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });

      if (error) throw error;

      setState("sent");
      window.setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 4000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!hasEmail || isSending}
      title={!hasEmail ? "لا يوجد بريد إلكتروني لهذا الموظف" : undefined}
      className="md-btn-tonal inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Mail className="h-4 w-4" aria-hidden />
      {STATE_LABELS[state]}
    </button>
  );
}
