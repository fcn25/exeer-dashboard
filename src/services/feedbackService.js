import { supabase } from "../utils/supabaseClient.js";

export async function sendFeedback({ message, category }) {
  const trimmed = String(message ?? "").trim();
  if (!trimmed) {
    throw new Error("Message is required.");
  }

  const { data, error } = await supabase.functions.invoke("send-feedback", {
    body: {
      message: trimmed,
      category: category ?? undefined,
    },
  });

  if (error || data?.error || !data?.ok) {
    throw new Error(
      data?.error || error?.message || "تعذّر إرسال الملاحظة.",
    );
  }

  return data;
}
