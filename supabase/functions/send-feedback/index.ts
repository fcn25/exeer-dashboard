import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";

const MAX_MESSAGE_LENGTH = 4000;
const FROM_ADDRESS = "Exeer <noreply@exeerai.com>";
const TO_ADDRESS = "hello@exeerai.com";

type FeedbackPayload = {
  message?: unknown;
  category?: unknown;
};

async function sendViaResend(params: {
  apiKey: string;
  replyTo?: string;
  subject: string;
  text: string;
}) {
  const payload: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to: [TO_ADDRESS],
    subject: params.subject,
    text: params.text,
  };

  if (params.replyTo) {
    payload.reply_to = params.replyTo;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend API error:", res.status, errBody);
    throw new Error("Failed to send feedback email.");
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return jsonResponse({ error: "Email service is not configured." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ error: "Server configuration error." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: FeedbackPayload = {};
    try {
      body = (await req.json()) as FeedbackPayload;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const message = String(body.message ?? "").trim();
    if (!message) {
      return jsonResponse({ error: "Message is required." }, 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse(
        { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` },
        400,
      );
    }

    const categoryRaw =
      body.category != null ? String(body.category).trim() : "";
    const category = categoryRaw ? categoryRaw.slice(0, 200) : null;

    const userEmail = String(user.email ?? "").trim() || null;
    const userId = user.id;
    const timestamp = new Date().toISOString();

    const subject = `اقتراح/ملاحظة جديدة${category ? ` — ${category}` : ""}`;

    const textParts: string[] = [];
    if (category) {
      textParts.push(`التصنيف: ${category}`, "");
    }
    textParts.push(
      "الرسالة:",
      message,
      "",
      "---",
      `User ID: ${userId}`,
      userEmail ? `Email: ${userEmail}` : "Email: (not available)",
      `Timestamp: ${timestamp}`,
    );

    await sendViaResend({
      apiKey: resendApiKey,
      replyTo: userEmail ?? undefined,
      subject,
      text: textParts.join("\n"),
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("send-feedback error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send feedback.";
    return jsonResponse({ error: message }, 500);
  }
});
