/** Smart Agent (natural-language executor) — hidden from dashboard entry when false. */
export const ENABLE_AI_AGENT =
  String(import.meta.env.VITE_ENABLE_AI_AGENT ?? "false").toLowerCase() === "true";
