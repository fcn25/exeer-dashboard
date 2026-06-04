/** Shown when VITE_GEMINI_API_KEY is missing or blank in the Vite env. */
export const GEMINI_MISSING_KEY_MESSAGE =
  "مفتاح Gemini غير مُعدّ. أضف VITE_GEMINI_API_KEY إلى ملف .env";

/**
 * Reads the Gemini API key from Vite env (never hardcode in source).
 * @returns {string}
 */
export function getGeminiApiKeyFromEnv() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key == null || typeof key !== "string") return "";
  return key.trim();
}

/**
 * @returns {string | null} Configuration error message, or null when the key is set.
 */
export function getGeminiConfigurationError() {
  if (!getGeminiApiKeyFromEnv()) {
    return GEMINI_MISSING_KEY_MESSAGE;
  }
  return null;
}

/** Throws with {@link GEMINI_MISSING_KEY_MESSAGE} when the key is not configured. */
export function assertGeminiConfigured() {
  const configError = getGeminiConfigurationError();
  if (configError) {
    throw new Error(configError);
  }
}

/** True when an error message is the missing-key configuration error. */
export function isGeminiMissingKeyError(message) {
  return String(message ?? "").trim() === GEMINI_MISSING_KEY_MESSAGE;
}
